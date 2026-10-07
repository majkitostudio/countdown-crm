-- Countdown CRM: Task 4.1 — Monthly Commission Settlement for Team Leaders
-- Enables workspace managers (Team Leader, Administrator) and service_role
-- to finalize monthly commissions for completed calendar months.
-- Accurately accounts for returned orders ('returned') which reduce net turnover.

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
  -- Authorization: allow service_role OR workspace manager/admin
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

  SELECT * INTO settings_row
  FROM public.wallet_settings
  WHERE workspace_id = p_workspace_id;
  IF settings_row.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Wallet settings are not configured for the workspace';
  END IF;

  period_end := (p_period_start + INTERVAL '1 month')::DATE;

  -- Delivered orders in this period
  SELECT coalesce(sum(order_row.total_amount), 0)
  INTO delivered_total
  FROM public.orders AS order_row
  WHERE order_row.workspace_id = p_workspace_id
    AND order_row.agent_id = p_user_id
    AND order_row.status = 'delivered'
    AND upper(order_row.currency) = settings_row.currency
    AND order_row.delivered_at >= p_period_start::TIMESTAMPTZ
    AND order_row.delivered_at < period_end::TIMESTAMPTZ;

  -- Returned orders in this period that reduce net turnover
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
    workspace_id, actor_id, actor_name, action, target_resource,
    details, severity, ip_address
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

-- Batch settlement function for the whole workspace
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
