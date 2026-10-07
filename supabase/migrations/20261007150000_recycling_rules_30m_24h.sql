-- Countdown CRM: Task 2.1 — Automatic Lead Recycling Rules
-- 1. Outcome 'no_answer' (Inaccessible) automatically requeued after 30 minutes (updated from 15 min).
-- 2. Outcome 'objection' with 'unsuccessful_sale' (Neúspěch) requeued into P4 queue after 24 hours.

-- Upgrade private.complete_lead_call_impl to use 30 minutes for no_answer
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
    -- Task 2.1: Requeue after 30 minutes
    next_callback_at := NOW() + INTERVAL '30 minutes';
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

-- Upgrade complete_lead_call_with_order_items to handle unsuccessful_sale (24h cooldown to P4)
CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items(
  target_queue_item_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  call_note TEXT DEFAULT NULL,
  call_fail_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  current_team_id UUID;
  target_lead_id UUID;
  p4_team_id UUID;
  cooldown_interval INTERVAL;
  has_order BOOLEAN := FALSE;
  first_product_id UUID := NULL;
  total_amount NUMERIC := 0;
  item RECORD;
  product RECORD;
  completion JSONB;
  completed_call_id UUID;
  created_order_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT workspace_id, team_id, lead_id
  INTO active_workspace_id, current_team_id, target_lead_id
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id;

  IF active_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Queue item not found or not assigned to current operator';
  END IF;

  IF order_items IS NOT NULL AND jsonb_typeof(order_items) = 'array' AND jsonb_array_length(order_items) > 0 THEN
    has_order := TRUE;

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
      SELECT catalog_product.*
      INTO product
      FROM public.products AS catalog_product
      WHERE catalog_product.id = item.product_id
        AND catalog_product.workspace_id = active_workspace_id;

      IF product.id IS NULL THEN
        RAISE EXCEPTION 'Order product does not belong to the active workspace';
      END IF;

      IF first_product_id IS NULL THEN
        first_product_id := product.id;
      END IF;
      total_amount := total_amount + round(item.unit_price, 2) * item.quantity;
    END LOOP;
  END IF;

  completion := private.complete_lead_call_impl(
    target_queue_item_id,
    call_duration_seconds,
    call_outcome,
    call_transcript,
    call_ai_sentiment,
    first_product_id,
    CASE WHEN has_order THEN round(total_amount, 2) ELSE NULL END,
    callback_scheduled_at
  );

  completed_call_id := NULLIF(completion ->> 'call_id', '')::UUID;
  IF completed_call_id IS NULL THEN
    RAISE EXCEPTION 'Call completion did not return a call ID';
  END IF;

  created_order_id := NULLIF(completion ->> 'order_id', '')::UUID;
  IF has_order THEN
    IF created_order_id IS NULL THEN
      RAISE EXCEPTION 'Call completion did not return the created order';
    END IF;

    PERFORM set_config('countdown.order_edit_rpc', 'on', true);

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
      SELECT catalog_product.*
      INTO product
      FROM public.products AS catalog_product
      WHERE catalog_product.id = item.product_id
        AND catalog_product.workspace_id = active_workspace_id;

      INSERT INTO public.order_items (
        workspace_id,
        order_id,
        product_id,
        product_title_snapshot,
        unit_price,
        minimum_unit_price,
        quantity,
        line_total,
        currency
      )
      VALUES (
        active_workspace_id,
        created_order_id,
        product.id,
        product.title,
        round(item.unit_price, 2),
        round(product.price, 2),
        item.quantity,
        round(round(item.unit_price, 2) * item.quantity, 2),
        upper(coalesce(product.currency, 'USD'))
      );
    END LOOP;
  END IF;

  UPDATE public.calls
  SET operator_note = NULLIF(btrim(call_note), ''),
      fail_reason = call_fail_reason
  WHERE id = completed_call_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Call completion details could not be saved';
  END IF;

  -- Task 2.1 P4 Recycling: unsuccessful_sale (24h) and other recyclable objections
  IF call_outcome = 'objection' AND call_fail_reason IN ('unsuccessful_sale', 'needs_time', 'price', 'distrust', 'alternative_solution', 'other') THEN
    cooldown_interval := CASE call_fail_reason
      WHEN 'unsuccessful_sale' THEN INTERVAL '24 hours'
      WHEN 'needs_time' THEN INTERVAL '3 days'
      WHEN 'price' THEN INTERVAL '14 days'
      WHEN 'other' THEN INTERVAL '14 days'
      WHEN 'distrust' THEN INTERVAL '21 days'
      WHEN 'alternative_solution' THEN INTERVAL '30 days'
      ELSE INTERVAL '24 hours'
    END;

    -- Look up P4 department team
    SELECT t.id INTO p4_team_id
    FROM public.teams AS t
    WHERE t.workspace_id = active_workspace_id
      AND (t.slug = 'p4' OR lower(t.name) = 'oddělení p4')
    LIMIT 1;

    -- Recycle lead queue item to P4 department
    UPDATE public.lead_queue_items
    SET state = 'available',
        team_id = COALESCE(p4_team_id, current_team_id),
        priority = -4,
        available_at = NOW() + cooldown_interval,
        scheduled_at = NULL,
        preferred_operator_id = NULL,
        assigned_operator_id = NULL,
        last_outcome = 'objection',
        released_at = NOW(),
        completed_at = NULL,
        recovery_required = FALSE,
        updated_at = NOW()
    WHERE id = target_queue_item_id;

    -- Update lead status back to contacted and assign to P4 team
    UPDATE public.leads
    SET status = 'contacted',
        team_id = COALESCE(p4_team_id, current_team_id),
        updated_at = NOW()
    WHERE id = target_lead_id;

    -- Record queue event for P4 recycling
    PERFORM private.record_queue_event(
      target_queue_item_id,
      'requeued',
      'awaiting_outcome', 'available', current_user_id, NULL, current_user_id,
      'objection', jsonb_build_object(
        'call_id', completed_call_id,
        'fail_reason', call_fail_reason,
        'p4_recycled', true,
        'available_at', (NOW() + cooldown_interval)
      )
    );

    -- Augment completion result to reflect recycled state
    completion := completion || jsonb_build_object(
      'queue_state', 'available',
      'lead_status', 'contacted',
      'p4_recycled', true,
      'available_at', (NOW() + cooldown_interval)
    );
  END IF;

  RETURN completion;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
