-- Countdown CRM: preserve the team responsible for historical calls and orders.
-- Existing rows remain nullable because their historical team is unknown.

CREATE OR REPLACE FUNCTION private.populate_historical_team_snapshot()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  lead_team_id UUID;
BEGIN
  IF NEW.lead_id IS NULL THEN
    NEW.team_id := NULL;
    RETURN NEW;
  END IF;

  SELECT lead.team_id
  INTO lead_team_id
  FROM public.leads AS lead
  WHERE lead.id = NEW.lead_id
    AND lead.workspace_id = NEW.workspace_id;

  IF NEW.team_id IS NULL THEN
    NEW.team_id := lead_team_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calls_populate_historical_team_snapshot ON public.calls;
CREATE TRIGGER calls_populate_historical_team_snapshot
  BEFORE INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION private.populate_historical_team_snapshot();

DROP TRIGGER IF EXISTS orders_populate_historical_team_snapshot ON public.orders;
CREATE TRIGGER orders_populate_historical_team_snapshot
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION private.populate_historical_team_snapshot();

CREATE OR REPLACE FUNCTION private.prevent_historical_team_snapshot_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    RAISE EXCEPTION 'Historical team snapshot cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calls_prevent_historical_team_snapshot_change ON public.calls;
CREATE TRIGGER calls_prevent_historical_team_snapshot_change
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_historical_team_snapshot_change();

DROP TRIGGER IF EXISTS orders_prevent_historical_team_snapshot_change ON public.orders;
CREATE TRIGGER orders_prevent_historical_team_snapshot_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_historical_team_snapshot_change();

-- Direct authenticated inserts must use the current lead team. The trusted
-- queue completion function may provide its queue snapshot explicitly.
DROP POLICY IF EXISTS "Workspace members can create calls" ON public.calls;
CREATE POLICY "Workspace members can create calls"
  ON public.calls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND private.is_workspace_member(workspace_id)
    AND (
      (lead_id IS NULL AND team_id IS NULL)
      OR EXISTS (
        SELECT 1
        FROM public.leads AS lead
        WHERE lead.id = calls.lead_id
          AND lead.workspace_id = calls.workspace_id
          AND calls.team_id IS NOT DISTINCT FROM lead.team_id
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members can create orders" ON public.orders;
CREATE POLICY "Workspace members can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND private.can_create_order_for_lead(workspace_id, lead_id)
    AND (
      (lead_id IS NULL AND team_id IS NULL)
      OR EXISTS (
        SELECT 1
        FROM public.leads AS lead
        WHERE lead.id = orders.lead_id
          AND lead.workspace_id = orders.workspace_id
          AND orders.team_id IS NOT DISTINCT FROM lead.team_id
      )
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.products AS product
        WHERE product.id = orders.product_id
          AND product.workspace_id = orders.workspace_id
      )
    )
  );

-- Queue completion has the strongest historical context: the team that owned
-- the routed queue item. Keep that snapshot explicitly on both records.
CREATE OR REPLACE FUNCTION private.complete_lead_call_impl(
  target_queue_item_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_product_id UUID DEFAULT NULL,
  order_total_amount NUMERIC DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
  call_id UUID;
  order_id UUID;
  next_item_id UUID;
  next_callback_at TIMESTAMPTZ;
  next_queue_state TEXT;
  next_lead_status TEXT;
  effective_duration_seconds INTEGER;
BEGIN
  IF call_duration_seconds IS NULL OR call_duration_seconds < 0 THEN RAISE EXCEPTION 'Call duration must be a non-negative integer'; END IF;
  IF call_outcome NOT IN ('order_placed', 'followup_scheduled', 'no_answer', 'objection') THEN RAISE EXCEPTION 'Unsupported queue call outcome'; END IF;
  IF (order_product_id IS NULL) <> (order_total_amount IS NULL) THEN RAISE EXCEPTION 'Order product and amount must be provided together'; END IF;
  IF order_total_amount IS NOT NULL AND order_total_amount < 0 THEN RAISE EXCEPTION 'Order amount must be non-negative'; END IF;
  IF order_product_id IS NOT NULL AND call_outcome <> 'order_placed' THEN RAISE EXCEPTION 'Order data requires the order outcome'; END IF;
  IF call_outcome = 'order_placed' AND order_product_id IS NULL THEN RAISE EXCEPTION 'Create Order requires a product and amount'; END IF;
  IF call_outcome = 'followup_scheduled' AND callback_scheduled_at IS NULL THEN RAISE EXCEPTION 'Callback date and time are required'; END IF;
  IF call_outcome <> 'followup_scheduled' AND callback_scheduled_at IS NOT NULL THEN RAISE EXCEPTION 'Callback time is only valid for Schedule Callback'; END IF;

  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id AND state = 'awaiting_outcome'
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead assignment is not awaiting an outcome for this Operator'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only an Operator member can complete queue work'; END IF;

  effective_duration_seconds := call_duration_seconds;
  IF queue_item.call_started_at IS NOT NULL THEN
    effective_duration_seconds := GREATEST(
      0,
      ROUND(EXTRACT(EPOCH FROM (COALESCE(queue_item.call_ended_at, NOW()) - queue_item.call_started_at)))::INTEGER
    );
  END IF;

  IF order_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.products AS product
    WHERE product.id = order_product_id AND product.workspace_id = queue_item.workspace_id
  ) THEN RAISE EXCEPTION 'Order product does not belong to the active workspace'; END IF;

  INSERT INTO public.calls (
    workspace_id, team_id, lead_id, agent_id, duration_seconds, outcome, transcript, ai_sentiment
  )
  VALUES (
    queue_item.workspace_id, queue_item.team_id, queue_item.lead_id, current_user_id, effective_duration_seconds,
    CASE WHEN call_outcome = 'objection' THEN 'objection' ELSE call_outcome END,
    call_transcript, COALESCE(NULLIF(call_ai_sentiment, ''), 'Neutral')
  )
  RETURNING id INTO call_id;

  IF order_product_id IS NOT NULL THEN
    INSERT INTO public.orders (workspace_id, team_id, lead_id, product_id, agent_id, total_amount, status)
    VALUES (queue_item.workspace_id, queue_item.team_id, queue_item.lead_id, order_product_id, current_user_id, order_total_amount, 'completed')
    RETURNING id INTO order_id;
  END IF;

  next_lead_status := CASE
    WHEN order_product_id IS NOT NULL THEN 'customer'
    WHEN call_outcome = 'objection' THEN 'unresponsive'
    ELSE 'contacted'
  END;
  UPDATE public.leads SET status = next_lead_status, updated_at = NOW()
  WHERE id = queue_item.lead_id AND workspace_id = queue_item.workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead status could not be updated'; END IF;

  IF call_outcome = 'followup_scheduled' THEN
    next_callback_at := callback_scheduled_at;
    IF next_callback_at <= NOW() THEN RAISE EXCEPTION 'Callback must be scheduled in the future'; END IF;
    next_queue_state := 'waiting_callback';
  ELSIF call_outcome = 'no_answer' THEN
    next_callback_at := NOW() + INTERVAL '15 minutes';
    next_queue_state := 'available';
  ELSE
    next_callback_at := NULL;
    next_queue_state := 'closed';
  END IF;

  UPDATE public.lead_queue_items
  SET state = next_queue_state, assigned_operator_id = NULL,
      preferred_operator_id = CASE WHEN next_queue_state IN ('available', 'waiting_callback') THEN current_user_id ELSE NULL END,
      available_at = COALESCE(next_callback_at, NOW()),
      scheduled_at = CASE WHEN next_queue_state = 'waiting_callback' THEN next_callback_at ELSE NULL END,
      lease_expires_at = NULL, last_heartbeat_at = NULL,
      last_outcome = call_outcome,
      released_at = CASE WHEN next_queue_state IN ('available', 'waiting_callback') THEN NOW() ELSE NULL END,
      completed_at = CASE WHEN next_queue_state = 'closed' THEN NOW() ELSE NULL END,
      recovery_required = FALSE, updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    CASE WHEN next_queue_state = 'waiting_callback' THEN 'callback_scheduled' WHEN next_queue_state = 'available' THEN 'requeued' ELSE 'completed' END,
    'awaiting_outcome', next_queue_state, current_user_id, NULL, current_user_id,
    call_outcome, jsonb_build_object('call_id', call_id, 'order_id', order_id, 'scheduled_at', next_callback_at, 'duration_seconds', effective_duration_seconds)
  );
  UPDATE public.operator_presence SET state = 'available', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;
  SELECT (private.claim_next_lead_impl(queue_item.workspace_id)::jsonb ->> 'queue_item_id')::UUID INTO next_item_id;

  RETURN jsonb_build_object(
    'call_id', call_id, 'order_id', order_id, 'lead_status', next_lead_status,
    'queue_state', next_queue_state, 'duration_seconds', effective_duration_seconds,
    'next_lead', CASE WHEN next_item_id IS NULL THEN NULL ELSE private.queue_snapshot(next_item_id) END
  );
END;
$$;
