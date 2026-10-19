-- Schedule vs Callback terminology unification (step B2).
--
-- Renames the lead queue state 'waiting_callback' -> 'scheduled' and the lead queue
-- event 'callback_scheduled' -> 'scheduled_call_created'. Affected objects:
--   * CHECK lead_queue_items_state_check
--   * CHECK lead_queue_items_check
--   * CHECK lead_queue_events_event_type_check
--   * RLS policy "Operators can view current queue item" (scheduled call visibility)
--   * functions private.assert_team_leader_exception_active, private.claim_next_lead_impl,
--     private.complete_lead_call_impl
--
-- No stored row uses either old token (only 'assigned' and 'available' queue items exist and
-- no 'callback_scheduled' event has ever been written), so this is a pure rename with no data
-- rewrite. The recreated functions keep their signatures, so CREATE OR REPLACE preserves
-- their privileges.

-- 1. Queue item state checks: 'waiting_callback' -> 'scheduled'
alter table public.lead_queue_items drop constraint lead_queue_items_state_check;
alter table public.lead_queue_items add constraint lead_queue_items_state_check
  check (
    state = any (array['available', 'assigned', 'in_progress', 'awaiting_outcome', 'scheduled', 'closed', 'paused'])
  );

alter table public.lead_queue_items drop constraint lead_queue_items_check;
alter table public.lead_queue_items add constraint lead_queue_items_check
  check (
    (
      state = any (array['assigned', 'in_progress', 'awaiting_outcome'])
      and assigned_operator_id is not null
    )
    or (
      state = any (array['available', 'scheduled', 'closed', 'paused'])
      and assigned_operator_id is null
    )
  );

-- 2. Queue event check: 'callback_scheduled' -> 'scheduled_call_created'
alter table public.lead_queue_events drop constraint lead_queue_events_event_type_check;
alter table public.lead_queue_events add constraint lead_queue_events_event_type_check
  check (
    event_type = any (array[
      'created', 'claimed', 'started', 'heartbeat', 'completed', 'released', 'reassigned',
      'scheduled_call_created', 'requeued', 'lease_expired', 'interrupted', 'outcome_pending',
      'reopened', 'paused', 'team_assigned'
    ])
  );

-- 3. Operators keep seeing their own scheduled calls (same policy, renamed state)
alter policy "Operators can view current queue item" on public.lead_queue_items
  to authenticated
  using (
    (
      assigned_operator_id = (select auth.uid())
      and state in ('assigned', 'in_progress', 'awaiting_outcome')
      and team_id is not null
      and private.is_team_member(team_id)
      and private.is_workspace_member(workspace_id)
    )
    or (
      preferred_operator_id = (select auth.uid())
      and state = 'scheduled'
      and team_id is not null
      and private.is_team_member(team_id)
      and private.is_workspace_member(workspace_id)
    )
  );

-- 4. Functions that read or write the renamed state and event tokens

CREATE OR REPLACE FUNCTION private.assert_team_leader_exception_active(p_workspace_id uuid, p_exception_key text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  exception_type TEXT;
  source_id UUID;
  source_occurred_at TIMESTAMPTZ;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Team Leader or Administrator access is required';
  END IF;

  IF p_exception_key IS NULL
     OR p_exception_key !~* '^(queue:(outcome_recovery|overdue_callback|expired_lease)|workflow:failure|script:missing|order:pickup_risk):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Exception key is invalid';
  END IF;

  exception_type := split_part(p_exception_key, ':', 1) || ':' || split_part(p_exception_key, ':', 2);
  source_id := split_part(p_exception_key, ':', 3)::UUID;

  IF exception_type IN ('workflow:failure', 'script:missing')
     AND NOT private.is_workspace_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Only Administrators can manage workspace-global exceptions';
  END IF;

  CASE exception_type
    WHEN 'queue:outcome_recovery' THEN
      SELECT queue_item.updated_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND (queue_item.recovery_required OR queue_item.state = 'awaiting_outcome');
    WHEN 'queue:overdue_callback' THEN
      SELECT queue_item.scheduled_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND queue_item.state = 'scheduled'
        AND queue_item.scheduled_at < NOW();
    WHEN 'queue:expired_lease' THEN
      SELECT queue_item.lease_expires_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND queue_item.state = 'assigned'
        AND queue_item.lease_expires_at < NOW();
    WHEN 'order:pickup_risk' THEN
      SELECT pickup_order.package_arrived_at + INTERVAL '3 days'
        INTO source_occurred_at
      FROM public.orders AS pickup_order
      WHERE pickup_order.id = source_id
        AND pickup_order.workspace_id = p_workspace_id
        AND pickup_order.status = 'sent'
        AND NULLIF(BTRIM(pickup_order.package_location), '') IS NOT NULL
        AND pickup_order.package_arrived_at IS NOT NULL
        AND pickup_order.package_arrived_at + INTERVAL '3 days' <= NOW()
        AND pickup_order.pickup_call_completed_at IS NULL;
    WHEN 'workflow:failure' THEN
      SELECT execution.created_at
        INTO source_occurred_at
      FROM public.workflow_executions AS execution
      WHERE execution.id = source_id
        AND execution.workspace_id = p_workspace_id
        AND execution.status = 'failure';
    WHEN 'script:missing' THEN
      SELECT product.created_at
        INTO source_occurred_at
      FROM public.products AS product
      WHERE product.id = source_id
        AND product.workspace_id = p_workspace_id
        AND product.in_stock
        AND NOT EXISTS (
          SELECT 1
          FROM public.product_scripts AS script
          WHERE script.workspace_id = product.workspace_id
            AND script.product_id = product.id
        );
  END CASE;

  IF source_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Exception is no longer active';
  END IF;

  RETURN source_occurred_at;
END;
$function$;

CREATE OR REPLACE FUNCTION private.claim_next_lead_impl(target_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  operator_team_id UUID;
  candidate_id UUID;
  current_item RECORD;
  candidate_item RECORD;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  operator_team_id := private.current_operator_team_id(target_workspace_id);

  PERFORM private.release_expired_operator_assignment(target_workspace_id, current_user_id);

  SELECT * INTO current_item
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.assigned_operator_id = current_user_id
    AND queue_item.state IN ('assigned', 'in_progress', 'awaiting_outcome')
  FOR UPDATE;

  IF current_item.id IS NOT NULL THEN
    IF current_item.team_id IS NULL THEN
      RAISE EXCEPTION 'Current queue assignment has no team ownership; contact an Administrator';
    END IF;
    IF current_item.team_id <> operator_team_id THEN
      RAISE EXCEPTION 'Current queue assignment belongs to another team';
    END IF;
    RETURN private.queue_snapshot(current_item.id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operator_presence AS presence
    WHERE presence.workspace_id = target_workspace_id
      AND presence.operator_id = current_user_id
      AND presence.state = 'available'
      AND presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
  ) THEN RAISE EXCEPTION 'Operator is not available for queue work'; END IF;

  SELECT queue_item.id INTO candidate_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.team_id = operator_team_id
    AND queue_item.state IN ('available', 'scheduled')
    AND queue_item.available_at <= NOW()
    AND (queue_item.scheduled_at IS NULL OR queue_item.scheduled_at <= NOW())
  ORDER BY
    -- Priority 0: Waiting callbacks for the CURRENT operator (top priority match)
    CASE
      WHEN queue_item.state = 'scheduled' AND queue_item.preferred_operator_id = current_user_id THEN 0
      WHEN queue_item.preferred_operator_id = current_user_id THEN 1
      WHEN queue_item.state = 'scheduled' THEN 2
      ELSE 3
    END,
    queue_item.priority DESC,
    COALESCE(queue_item.scheduled_at, queue_item.available_at) ASC,
    queue_item.created_at ASC,
    queue_item.id ASC
  FOR UPDATE SKIP LOCKED LIMIT 1;

  IF candidate_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO candidate_item
  FROM public.lead_queue_items
  WHERE id = candidate_id
  FOR UPDATE;

  UPDATE public.lead_queue_items
  SET state = 'assigned', assigned_operator_id = current_user_id,
      claimed_at = NOW(), last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      attempt_count = attempt_count + 1, released_at = NULL,
      recovery_required = FALSE, call_started_at = NULL, call_ended_at = NULL,
      updated_at = NOW()
  WHERE id = candidate_id;

  PERFORM private.record_queue_event(
    candidate_id, 'claimed', candidate_item.state, 'assigned',
    candidate_item.assigned_operator_id, current_user_id, current_user_id,
    NULL, '{}'
  );
  RETURN private.queue_snapshot(candidate_id);
END;
$function$;

CREATE OR REPLACE FUNCTION private.complete_lead_call_impl(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_product_id uuid DEFAULT NULL::uuid, order_total_amount numeric DEFAULT NULL::numeric, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
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
  IF call_outcome = 'followup_scheduled' AND scheduled_at IS NULL THEN RAISE EXCEPTION 'Callback date and time are required'; END IF;
  IF call_outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN RAISE EXCEPTION 'Callback time is only valid for Schedule Callback'; END IF;

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
    next_callback_at := scheduled_at;
    IF next_callback_at <= NOW() THEN RAISE EXCEPTION 'Callback must be scheduled in the future'; END IF;
    next_queue_state := 'scheduled';
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
      preferred_operator_id = CASE WHEN next_queue_state IN ('available', 'scheduled') THEN current_user_id ELSE NULL END,
      available_at = COALESCE(next_callback_at, NOW()),
      scheduled_at = CASE WHEN next_queue_state = 'scheduled' THEN next_callback_at ELSE NULL END,
      lease_expires_at = NULL, last_heartbeat_at = NULL,
      last_outcome = call_outcome,
      released_at = CASE WHEN next_queue_state IN ('available', 'scheduled') THEN NOW() ELSE NULL END,
      completed_at = CASE WHEN next_queue_state = 'closed' THEN NOW() ELSE NULL END,
      recovery_required = FALSE, updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    CASE WHEN next_queue_state = 'scheduled' THEN 'scheduled_call_created' WHEN next_queue_state = 'available' THEN 'requeued' ELSE 'completed' END,
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
$function$;
