-- Require team-scoped authorization for shipment events and monthly settlements.

CREATE OR REPLACE FUNCTION public.record_order_tracking_event(
  p_order_id UUID,
  p_status TEXT,
  p_title TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT clock_timestamp()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_old_status TEXT;
  v_new_event JSONB;
  v_updated_events JSONB;
  v_event_id TEXT;
  v_fulfillment_event TEXT;
  v_jwt_role TEXT := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_jwt_role <> 'service_role'
     AND NOT private.can_manage_team_resource(v_order.workspace_id, v_order.team_id)
  THEN
    RAISE EXCEPTION 'Insufficient order permissions' USING ERRCODE = '42501';
  END IF;

  v_old_status := v_order.status;
  v_event_id := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_new_event := jsonb_build_object(
    'id', v_event_id,
    'occurred_at', to_char(COALESCE(p_occurred_at, clock_timestamp()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'status', COALESCE(NULLIF(trim(p_status), ''), v_order.status),
    'title', trim(p_title),
    'location', NULLIF(trim(p_location), ''),
    'description', NULLIF(trim(p_description), ''),
    'source', 'carrier'
  );
  v_updated_events := COALESCE(v_order.tracking_events, '[]'::jsonb) || jsonb_build_array(v_new_event);

  IF p_status IN ('delivered', 'returned') AND v_old_status != p_status THEN
    v_fulfillment_event := 'carrier_event_' || v_event_id;
    PERFORM set_config('countdown.fulfillment_event_id', v_fulfillment_event, true);

    UPDATE public.orders
    SET
      status = p_status,
      package_location = COALESCE(NULLIF(trim(p_location), ''), package_location),
      tracking_events = v_updated_events,
      delivered_at = CASE WHEN p_status = 'delivered' THEN clock_timestamp() ELSE delivered_at END,
      returned_at = CASE WHEN p_status = 'returned' THEN clock_timestamp() ELSE returned_at END,
      fulfillment_event_id = v_fulfillment_event,
      revision = revision + 1
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    INSERT INTO public.order_status_history (
      order_id, workspace_id, from_status, to_status, actor_id, actor_name, note
    ) VALUES (
      v_order.id, v_order.workspace_id, v_old_status, p_status, auth.uid(),
      COALESCE(p_title, 'Kurýrní API / Webhook'), COALESCE(p_description, p_location)
    );
  ELSE
    UPDATE public.orders
    SET
      package_location = COALESCE(NULLIF(trim(p_location), ''), package_location),
      tracking_events = v_updated_events,
      revision = revision + 1
    WHERE id = p_order_id
    RETURNING * INTO v_order;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'package_location', v_order.package_location,
    'tracking_events', v_order.tracking_events,
    'revision', v_order.revision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_tracking_event(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_order_tracking_event(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.finalize_wallet_monthly_commission(
  p_workspace_id UUID,
  p_user_id UUID,
  p_period_start DATE
)
RETURNS public.wallet_transactions
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  settings_row public.wallet_settings;
  member_exists BOOLEAN;
  delivered_total NUMERIC;
  returned_total NUMERIC;
  net_delivered_total NUMERIC;
  commission_amount NUMERIC;
  transaction_row public.wallet_transactions;
  audit_id UUID;
  period_end DATE;
  jwt_role TEXT := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF jwt_role <> 'service_role' THEN
    IF current_user_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
      RAISE EXCEPTION 'Insufficient workspace permissions';
    END IF;
  END IF;

  IF p_workspace_id IS NULL OR p_user_id IS NULL OR p_period_start IS NULL
     OR p_period_start <> date_trunc('month', p_period_start)::DATE
  THEN
    RAISE EXCEPTION 'Workspace, member and first day of month are required';
  END IF;

  IF p_period_start >= date_trunc('month', now())::DATE THEN
    RAISE EXCEPTION 'Only completed months can be finalized';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) INTO member_exists;
  IF NOT member_exists THEN
    RAISE EXCEPTION 'The wallet member is not in the workspace';
  END IF;

  IF jwt_role <> 'service_role'
     AND NOT private.is_workspace_admin(p_workspace_id)
     AND NOT EXISTS (
       SELECT 1
       FROM public.workspace_members AS operator_member
       JOIN public.team_memberships AS operator_team
         ON operator_team.workspace_id = operator_member.workspace_id
        AND operator_team.user_id = operator_member.user_id
        AND operator_team.membership_role = 'member'
        AND operator_team.active_from <= now()
        AND (operator_team.active_until IS NULL OR operator_team.active_until > now())
       JOIN public.teams AS team
         ON team.id = operator_team.team_id
        AND team.workspace_id = operator_team.workspace_id
        AND team.status = 'active'
       WHERE operator_member.workspace_id = p_workspace_id
         AND operator_member.user_id = p_user_id
         AND operator_member.role = 'operator'
         AND private.is_team_leader(team.id)
     )
  THEN
    RAISE EXCEPTION 'The operator is outside your active teams' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO settings_row
  FROM public.wallet_settings
  WHERE workspace_id = p_workspace_id;
  IF settings_row.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Wallet settings are not configured for the workspace';
  END IF;

  period_end := (p_period_start + INTERVAL '1 month')::DATE;

  SELECT coalesce(sum(order_row.total_amount), 0)
  INTO delivered_total
  FROM public.orders AS order_row
  WHERE order_row.workspace_id = p_workspace_id
    AND order_row.agent_id = p_user_id
    AND order_row.status IN ('delivered', 'returned')
    AND upper(order_row.currency) = settings_row.currency
    AND order_row.delivered_at >= p_period_start::TIMESTAMPTZ
    AND order_row.delivered_at < period_end::TIMESTAMPTZ;

  SELECT coalesce(sum(order_row.total_amount), 0)
  INTO returned_total
  FROM public.orders AS order_row
  WHERE order_row.workspace_id = p_workspace_id
    AND order_row.agent_id = p_user_id
    AND order_row.status = 'returned'
    AND upper(order_row.currency) = settings_row.currency
    AND (
      (order_row.returned_at >= p_period_start::TIMESTAMPTZ AND order_row.returned_at < period_end::TIMESTAMPTZ)
      OR (order_row.delivered_at >= p_period_start::TIMESTAMPTZ AND order_row.delivered_at < period_end::TIMESTAMPTZ)
    );

  net_delivered_total := greatest(delivered_total - returned_total, 0);
  commission_amount := round(net_delivered_total * settings_row.monthly_commission_rate / 100, 2);

  IF commission_amount <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO transaction_row
  FROM public.wallet_transactions
  WHERE source_event_id = format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start);
  IF transaction_row.id IS NOT NULL THEN
    RETURN transaction_row;
  END IF;

  INSERT INTO public.audit_logs (
    workspace_id, actor_id, actor_name, action, target_resource, details, severity, ip_address
  )
  VALUES (
    p_workspace_id,
    coalesce(current_user_id::TEXT, 'system'),
    CASE WHEN current_user_id IS NOT NULL THEN 'Team Leader / Admin' ELSE 'Wallet settlement system' END,
    'WALLET_MONTHLY_COMMISSION_POSTED',
    'Wallet transaction',
    format('Měsíční provize %s %s schválena pro %s (doručeno %s, vratky %s, čistý obrat %s %s).',
      commission_amount, settings_row.currency, p_user_id, delivered_total, returned_total, net_delivered_total, settings_row.currency),
    'low', 'server'
  )
  RETURNING id INTO audit_id;

  INSERT INTO public.wallet_transactions (
    workspace_id, user_id, amount, currency, transaction_type, source_type,
    source_event_id, source_period_start, reason, author_id, audit_log_id, rule_snapshot
  )
  VALUES (
    p_workspace_id, p_user_id, commission_amount, settings_row.currency,
    'monthly_commission', 'commission_period',
    format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start),
    p_period_start,
    format('Měsíční provize za %s: čistý obrat %s %s (vratky odečteny).', to_char(p_period_start, 'YYYY-MM'), net_delivered_total, settings_row.currency),
    current_user_id, audit_id,
    jsonb_build_object(
      'delivered_total', delivered_total,
      'returned_total', returned_total,
      'net_delivered_total', net_delivered_total,
      'commission_rate', settings_row.monthly_commission_rate,
      'currency', settings_row.currency
    )
  )
  ON CONFLICT (source_event_id) DO NOTHING
  RETURNING * INTO transaction_row;

  IF transaction_row.id IS NULL THEN
    SELECT * INTO transaction_row
    FROM public.wallet_transactions
    WHERE source_event_id = format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start);
  END IF;
  RETURN transaction_row;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_wallet_monthly_commission(UUID, UUID, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_wallet_monthly_commission(UUID, UUID, DATE)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.finalize_workspace_monthly_settlement(
  p_workspace_id UUID,
  p_period_start DATE
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  jwt_role TEXT := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  operator_rec RECORD;
  finalized_count INT := 0;
  total_commission NUMERIC := 0;
  txn public.wallet_transactions;
  results JSONB := '[]'::JSONB;
BEGIN
  IF jwt_role <> 'service_role' THEN
    IF current_user_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
      RAISE EXCEPTION 'Insufficient workspace permissions';
    END IF;
  END IF;

  FOR operator_rec IN
    SELECT DISTINCT wm.user_id, p.full_name
    FROM public.workspace_members AS wm
    JOIN public.profiles AS p ON p.id = wm.user_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.role = 'operator'
      AND (
        jwt_role = 'service_role'
        OR private.is_workspace_admin(p_workspace_id)
        OR EXISTS (
          SELECT 1
          FROM public.team_memberships AS operator_team
          JOIN public.teams AS team
            ON team.id = operator_team.team_id
           AND team.workspace_id = operator_team.workspace_id
           AND team.status = 'active'
          WHERE operator_team.workspace_id = wm.workspace_id
            AND operator_team.user_id = wm.user_id
            AND operator_team.membership_role = 'member'
            AND operator_team.active_from <= now()
            AND (operator_team.active_until IS NULL OR operator_team.active_until > now())
            AND private.is_team_leader(team.id)
        )
      )
  LOOP
    txn := public.finalize_wallet_monthly_commission(p_workspace_id, operator_rec.user_id, p_period_start);
    IF txn IS NOT NULL THEN
      finalized_count := finalized_count + 1;
      total_commission := total_commission + txn.amount;
      results := results || jsonb_build_object(
        'user_id', operator_rec.user_id,
        'user_name', operator_rec.full_name,
        'amount', txn.amount,
        'currency', txn.currency,
        'transaction_id', txn.id
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'period_start', p_period_start,
    'finalized_count', finalized_count,
    'total_commission', total_commission,
    'settlements', results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_workspace_monthly_settlement(UUID, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_workspace_monthly_settlement(UUID, DATE)
  TO authenticated, service_role;
