-- Schedule vs Callback terminology unification (step B3a).
--
-- Finishes the database side of the terminology: the exception kind
-- 'overdue_callback' becomes 'overdue_scheduled_call', the operator-facing
-- validation messages stop saying "Callback", and the local variable
-- 'next_callback_at' becomes 'next_scheduled_at'.
--
-- Affected objects:
--   * CHECK team_leader_exception_actions_exception_key_check
--   * private.assert_team_leader_exception_active
--   * private.complete_call_with_order_items_idempotent
--   * private.complete_lead_call_impl
--   * private.complete_lead_call_with_order_items_idempotent (both signatures)
--
-- No stored row carries either token: public.team_leader_exception_actions is
-- empty and the messages are plain literals, so this needs no data rewrite.
-- Recreating the functions with CREATE OR REPLACE keeps signatures, privileges
-- and search_path settings.
-- 1. Exception key check: 'queue:overdue_callback:' -> 'queue:overdue_scheduled_call:'
alter table public.team_leader_exception_actions
  drop constraint team_leader_exception_actions_exception_key_check;
alter table public.team_leader_exception_actions
  add constraint team_leader_exception_actions_exception_key_check
  check (
    char_length(exception_key) between 1 and 250
    and exception_key ~* '^(queue:(outcome_recovery|overdue_scheduled_call|expired_lease)|workflow:failure|script:missing|order:pickup_risk):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- 2. Functions: renamed exception kind, operator-facing messages and local variable

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
     OR p_exception_key !~* '^(queue:(outcome_recovery|overdue_scheduled_call|expired_lease)|workflow:failure|script:missing|order:pickup_risk):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
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
    WHEN 'queue:overdue_scheduled_call' THEN
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
    -- Priority 0: Scheduled calls for the CURRENT operator (top priority match)
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

CREATE OR REPLACE FUNCTION private.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb DEFAULT NULL::jsonb, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, call_note text DEFAULT NULL::text, call_fail_reason text DEFAULT NULL::text)
 RETURNS TABLE(call_id uuid, order_id uuid, lead_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  target_lead_id UUID := lead_id;
  request_key UUID := completion_key;
  request_fingerprint TEXT;
  existing_actor_id UUID;
  existing_fingerprint TEXT;
  existing_result JSONB;
  completion RECORD;
BEGIN
  IF current_user_id IS NULL
     OR completion_key IS NULL
     OR call_session_id IS NULL
     OR completion_key <> call_session_id THEN
    RAISE EXCEPTION 'Completion identity is required';
  END IF;
  IF duration_seconds IS NULL OR duration_seconds < 0 THEN
    RAISE EXCEPTION 'Call duration must be a non-negative integer';
  END IF;
  IF call_note IS NOT NULL AND char_length(call_note) > 2000 THEN
    RAISE EXCEPTION 'Call note must contain at most 2,000 characters';
  END IF;
  IF outcome = 'objection' THEN
    IF call_fail_reason IS NULL OR call_fail_reason NOT IN (
      'price', 'distrust', 'alternative_solution', 'health_concern',
      'no_interest', 'needs_time', 'other'
    ) THEN
      RAISE EXCEPTION 'Fail outcomes require a fail reason';
    END IF;
    IF call_note IS NULL OR btrim(call_note) = '' THEN
      RAISE EXCEPTION 'Fail outcomes require an operator note';
    END IF;
  ELSIF call_fail_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Fail reason is only valid for a fail outcome';
  END IF;
  IF outcome = 'followup_scheduled' AND scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Scheduled call date and time are required';
  END IF;
  IF outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Scheduled call time is only valid for the followup outcome';
  END IF;

  SELECT session.workspace_id
  INTO active_workspace_id
  FROM public.telephony_call_sessions AS session
  WHERE session.id = call_session_id
    AND session.lead_id = target_lead_id
    AND session.operator_id = current_user_id
    AND session.status IN ('connected', 'ended');

  IF active_workspace_id IS NULL OR NOT private.is_workspace_member(active_workspace_id) THEN
    RAISE EXCEPTION 'Call session is not available to the authenticated operator';
  END IF;

  request_fingerprint := md5(jsonb_build_object(
    'call_session_id', call_session_id,
    'lead_id', lead_id,
    'duration_seconds', duration_seconds,
    'outcome', outcome,
    'transcript', transcript,
    'ai_sentiment', ai_sentiment,
    'order_items', order_items,
    'scheduled_at', scheduled_at,
    'call_note', call_note,
    'call_fail_reason', call_fail_reason
  )::TEXT);

  SELECT request.actor_id, request.request_fingerprint, request.result
  INTO existing_actor_id, existing_fingerprint, existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
  FOR UPDATE;

  IF FOUND THEN
    IF existing_actor_id <> current_user_id THEN
      RAISE EXCEPTION 'Completion identity belongs to another operator';
    END IF;
    IF existing_fingerprint <> request_fingerprint THEN
      RAISE EXCEPTION 'Completion request key was reused with a different payload';
    END IF;
    IF existing_result IS NULL THEN
      RAISE EXCEPTION 'Completion request is still incomplete';
    END IF;
    RETURN QUERY SELECT
      NULLIF(existing_result ->> 'call_id', '')::UUID,
      NULLIF(existing_result ->> 'order_id', '')::UUID,
      existing_result ->> 'lead_status';
    RETURN;
  END IF;

  INSERT INTO public.call_completion_requests (
    workspace_id, completion_key, actor_id, request_fingerprint
  )
  VALUES (active_workspace_id, request_key, current_user_id, request_fingerprint)
  ON CONFLICT DO NOTHING;

  SELECT request.actor_id, request.request_fingerprint, request.result
  INTO existing_actor_id, existing_fingerprint, existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
  FOR UPDATE;

  IF existing_actor_id <> current_user_id THEN
    RAISE EXCEPTION 'Completion identity belongs to another operator';
  END IF;
  IF existing_fingerprint <> request_fingerprint THEN
    RAISE EXCEPTION 'Completion request key was reused with a different payload';
  END IF;
  IF existing_result IS NOT NULL THEN
    RETURN QUERY SELECT
      NULLIF(existing_result ->> 'call_id', '')::UUID,
      NULLIF(existing_result ->> 'order_id', '')::UUID,
      existing_result ->> 'lead_status';
    RETURN;
  END IF;

  SELECT *
  INTO completion
  FROM public.complete_call_with_order_items(
    target_lead_id,
    duration_seconds,
    outcome,
    transcript,
    ai_sentiment,
    order_items
  );

  UPDATE public.calls
  SET operator_note = NULLIF(btrim(call_note), ''),
      fail_reason = call_fail_reason,
      scheduled_at = $9
  WHERE public.calls.id = completion.call_id
    AND public.calls.workspace_id = active_workspace_id
    AND public.calls.agent_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Call completion details could not be saved';
  END IF;

  existing_result := jsonb_build_object(
    'call_id', completion.call_id,
    'order_id', completion.order_id,
    'lead_status', completion.lead_status
  );

  UPDATE public.call_completion_requests
  SET result = existing_result,
      call_id = completion.call_id,
      order_id = completion.order_id
  WHERE workspace_id = active_workspace_id
    AND call_completion_requests.completion_key = request_key;

  RETURN QUERY SELECT completion.call_id, completion.order_id, completion.lead_status;
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
  next_scheduled_at TIMESTAMPTZ;
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
  IF call_outcome = 'followup_scheduled' AND scheduled_at IS NULL THEN RAISE EXCEPTION 'Scheduled call date and time are required'; END IF;
  IF call_outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN RAISE EXCEPTION 'Scheduled call time is only valid for the followup outcome'; END IF;

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
    next_scheduled_at := scheduled_at;
    IF next_scheduled_at <= NOW() THEN RAISE EXCEPTION 'Scheduled call must be in the future'; END IF;
    next_queue_state := 'scheduled';
  ELSIF call_outcome = 'no_answer' THEN
    -- Task 2.1: Requeue after 30 minutes
    next_scheduled_at := NOW() + INTERVAL '30 minutes';
    next_queue_state := 'available';
  ELSE
    next_scheduled_at := NULL;
    next_queue_state := 'closed';
  END IF;

  UPDATE public.lead_queue_items
  SET state = next_queue_state, assigned_operator_id = NULL,
      preferred_operator_id = CASE WHEN next_queue_state IN ('available', 'scheduled') THEN current_user_id ELSE NULL END,
      available_at = COALESCE(next_scheduled_at, NOW()),
      scheduled_at = CASE WHEN next_queue_state = 'scheduled' THEN next_scheduled_at ELSE NULL END,
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
    call_outcome, jsonb_build_object('call_id', call_id, 'order_id', order_id, 'scheduled_at', next_scheduled_at, 'duration_seconds', effective_duration_seconds)
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

CREATE OR REPLACE FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb DEFAULT NULL::jsonb, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, call_note text DEFAULT NULL::text, call_fail_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  active_lead_id UUID;
  active_lead_name TEXT;
  request_key UUID := completion_key;
  request_fingerprint TEXT;
  existing_actor_id UUID;
  existing_fingerprint TEXT;
  existing_result JSONB;
  completion JSONB;
BEGIN
  IF current_user_id IS NULL
     OR completion_key IS NULL
     OR call_session_id IS NULL
     OR completion_key <> call_session_id THEN
    RAISE EXCEPTION 'Completion identity is required';
  END IF;
  IF call_duration_seconds IS NULL OR call_duration_seconds < 0 THEN
    RAISE EXCEPTION 'Call duration must be a non-negative integer';
  END IF;
  IF call_note IS NOT NULL AND char_length(call_note) > 2000 THEN
    RAISE EXCEPTION 'Call note must contain at most 2,000 characters';
  END IF;
  IF call_outcome = 'objection' THEN
    IF call_fail_reason IS NULL OR call_fail_reason NOT IN (
      'price', 'distrust', 'alternative_solution', 'health_concern',
      'no_interest', 'needs_time', 'other',
      'unsuccessful_sale', 'invalid_lead', 'duplicate'
    ) THEN
      RAISE EXCEPTION 'Fail outcomes require a fail reason';
    END IF;
    IF call_fail_reason IN (
      'unsuccessful_sale', 'needs_time', 'price',
      'distrust', 'alternative_solution', 'other'
    ) AND (call_note IS NULL OR btrim(call_note) = '') THEN
      RAISE EXCEPTION 'Fail outcomes require an operator note';
    END IF;
  ELSIF call_fail_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Fail reason is only valid for a fail outcome';
  END IF;
  IF call_outcome = 'followup_scheduled' AND scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Scheduled call date and time are required';
  END IF;
  IF call_outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Scheduled call time is only valid for the followup outcome';
  END IF;

  SELECT queue_item.workspace_id, queue_item.lead_id, lead.full_name
  INTO active_workspace_id, active_lead_id, active_lead_name
  FROM public.telephony_call_sessions AS session
  JOIN public.lead_queue_items AS queue_item
    ON queue_item.id = session.queue_item_id
  JOIN public.leads AS lead
    ON lead.id = queue_item.lead_id
  WHERE session.id = call_session_id
    AND session.queue_item_id = target_queue_item_id
    AND session.lead_id = queue_item.lead_id
    AND session.operator_id = current_user_id
    AND session.status IN ('connected', 'ended');

  IF active_workspace_id IS NULL
     OR active_lead_id IS NULL
     OR NOT private.is_workspace_member(active_workspace_id)
     OR NOT EXISTS (
       SELECT 1
       FROM public.workspace_members AS member
       WHERE member.workspace_id = active_workspace_id
         AND member.user_id = current_user_id
         AND member.role = 'operator'
     ) THEN
    RAISE EXCEPTION 'Call session is not available to the authenticated operator';
  END IF;

  request_fingerprint := md5(jsonb_build_object(
    'target_queue_item_id', target_queue_item_id,
    'call_session_id', call_session_id,
    'call_duration_seconds', call_duration_seconds,
    'call_outcome', call_outcome,
    'call_transcript', call_transcript,
    'call_ai_sentiment', call_ai_sentiment,
    'order_items', order_items,
    'scheduled_at', scheduled_at,
    'call_note', call_note,
    'call_fail_reason', call_fail_reason
  )::TEXT);

  SELECT request.actor_id, request.request_fingerprint, request.result
  INTO existing_actor_id, existing_fingerprint, existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
  FOR UPDATE;

  IF FOUND THEN
    IF existing_actor_id <> current_user_id THEN
      RAISE EXCEPTION 'Completion identity belongs to another operator';
    END IF;
    IF existing_fingerprint <> request_fingerprint THEN
      RAISE EXCEPTION 'Completion request key was reused with a different payload';
    END IF;
    IF existing_result IS NULL THEN
      RAISE EXCEPTION 'Completion request is still incomplete';
    END IF;
    RETURN existing_result;
  END IF;

  INSERT INTO public.call_completion_requests (
    workspace_id, completion_key, actor_id, request_fingerprint
  )
  VALUES (active_workspace_id, request_key, current_user_id, request_fingerprint)
  ON CONFLICT DO NOTHING;

  SELECT request.actor_id, request.request_fingerprint, request.result
  INTO existing_actor_id, existing_fingerprint, existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
  FOR UPDATE;

  IF existing_actor_id <> current_user_id THEN
    RAISE EXCEPTION 'Completion identity belongs to another operator';
  END IF;
  IF existing_fingerprint <> request_fingerprint THEN
    RAISE EXCEPTION 'Completion request key was reused with a different payload';
  END IF;
  IF existing_result IS NOT NULL THEN
    RETURN existing_result;
  END IF;

  completion := public.complete_lead_call_with_order_items(
    target_queue_item_id,
    call_duration_seconds,
    call_outcome,
    call_transcript,
    call_ai_sentiment,
    order_items,
    scheduled_at,
    call_note,
    call_fail_reason
  );
  completion := completion || jsonb_build_object(
    'lead_id', active_lead_id,
    'lead_name', active_lead_name
  );

  UPDATE public.call_completion_requests
  SET result = completion,
      call_id = NULLIF(completion ->> 'call_id', '')::UUID,
      order_id = NULLIF(completion ->> 'order_id', '')::UUID
  WHERE workspace_id = active_workspace_id
    AND call_completion_requests.completion_key = request_key;

  RETURN completion;
END;
$function$;

CREATE OR REPLACE FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  active_lead_id UUID;
  active_lead_name TEXT;
  request_key UUID := completion_key;
  request_fingerprint TEXT;
  existing_actor_id UUID;
  existing_fingerprint TEXT;
  existing_result JSONB;
  completion JSONB;
  created_order_id UUID;
BEGIN
  IF current_user_id IS NULL OR completion_key IS NULL OR call_session_id IS NULL OR completion_key <> call_session_id THEN RAISE EXCEPTION 'Completion identity is required'; END IF;
  IF call_duration_seconds IS NULL OR call_duration_seconds < 0 THEN RAISE EXCEPTION 'Call duration must be a non-negative integer'; END IF;
  IF call_note IS NOT NULL AND char_length(call_note) > 2000 THEN RAISE EXCEPTION 'Call note must contain at most 2,000 characters'; END IF;
  IF call_outcome = 'objection' THEN
    IF call_fail_reason IS NULL OR call_fail_reason NOT IN ('price', 'distrust', 'alternative_solution', 'health_concern', 'no_interest', 'needs_time', 'other', 'unsuccessful_sale', 'invalid_lead', 'duplicate') THEN RAISE EXCEPTION 'Fail outcomes require a fail reason'; END IF;
    IF call_fail_reason IN ('unsuccessful_sale', 'needs_time', 'price', 'distrust', 'alternative_solution', 'other') AND (call_note IS NULL OR btrim(call_note) = '') THEN RAISE EXCEPTION 'Fail outcomes require an operator note'; END IF;
  ELSIF call_fail_reason IS NOT NULL THEN RAISE EXCEPTION 'Fail reason is only valid for a fail outcome'; END IF;
  IF call_outcome = 'followup_scheduled' AND scheduled_at IS NULL THEN RAISE EXCEPTION 'Scheduled call date and time are required'; END IF;
  IF call_outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN RAISE EXCEPTION 'Scheduled call time is only valid for the followup outcome'; END IF;
  IF order_items IS NOT NULL AND jsonb_typeof(order_items) = 'array' AND jsonb_array_length(order_items) > 0 THEN
    IF delivery_address_snapshot IS NULL OR jsonb_typeof(delivery_address_snapshot) <> 'object' OR NOT delivery_address_snapshot ?& ARRAY['recipient_name', 'line1', 'city', 'postal_code', 'country'] THEN RAISE EXCEPTION 'A complete delivery address is required'; END IF;
  ELSIF delivery_address_snapshot IS NOT NULL THEN RAISE EXCEPTION 'A delivery address is only valid for an order call'; END IF;

  SELECT queue_item.workspace_id, queue_item.lead_id, lead.full_name
  INTO active_workspace_id, active_lead_id, active_lead_name
  FROM public.telephony_call_sessions AS session
  JOIN public.lead_queue_items AS queue_item ON queue_item.id = session.queue_item_id
  JOIN public.leads AS lead ON lead.id = queue_item.lead_id
  WHERE session.id = call_session_id AND session.queue_item_id = target_queue_item_id
    AND session.lead_id = queue_item.lead_id AND session.operator_id = current_user_id
    AND session.status IN ('connected', 'ended');
  IF active_workspace_id IS NULL OR active_lead_id IS NULL OR NOT private.is_workspace_member(active_workspace_id)
    OR NOT EXISTS (SELECT 1 FROM public.workspace_members AS member WHERE member.workspace_id = active_workspace_id AND member.user_id = current_user_id AND member.role = 'operator') THEN RAISE EXCEPTION 'Call session is not available to the authenticated operator'; END IF;

  request_fingerprint := md5(jsonb_build_object('target_queue_item_id', target_queue_item_id, 'call_session_id', call_session_id, 'call_duration_seconds', call_duration_seconds, 'call_outcome', call_outcome, 'call_transcript', call_transcript, 'call_ai_sentiment', call_ai_sentiment, 'order_items', order_items, 'scheduled_at', scheduled_at, 'call_note', call_note, 'call_fail_reason', call_fail_reason, 'delivery_address_snapshot', delivery_address_snapshot)::TEXT);
  SELECT request.actor_id, request.request_fingerprint, request.result INTO existing_actor_id, existing_fingerprint, existing_result FROM public.call_completion_requests AS request WHERE request.workspace_id = active_workspace_id AND request.completion_key = request_key FOR UPDATE;
  IF FOUND THEN
    IF existing_actor_id <> current_user_id THEN RAISE EXCEPTION 'Completion identity belongs to another operator'; END IF;
    IF existing_fingerprint <> request_fingerprint THEN RAISE EXCEPTION 'Completion request key was reused with a different payload'; END IF;
    IF existing_result IS NULL THEN RAISE EXCEPTION 'Completion request is still incomplete'; END IF;
    RETURN existing_result;
  END IF;
  INSERT INTO public.call_completion_requests (workspace_id, completion_key, actor_id, request_fingerprint) VALUES (active_workspace_id, request_key, current_user_id, request_fingerprint) ON CONFLICT DO NOTHING;
  SELECT request.actor_id, request.request_fingerprint, request.result INTO existing_actor_id, existing_fingerprint, existing_result FROM public.call_completion_requests AS request WHERE request.workspace_id = active_workspace_id AND request.completion_key = request_key FOR UPDATE;
  IF existing_actor_id <> current_user_id THEN RAISE EXCEPTION 'Completion identity belongs to another operator'; END IF;
  IF existing_fingerprint <> request_fingerprint THEN RAISE EXCEPTION 'Completion request key was reused with a different payload'; END IF;
  IF existing_result IS NOT NULL THEN RETURN existing_result; END IF;

  completion := public.complete_lead_call_with_order_items(target_queue_item_id, call_duration_seconds, call_outcome, call_transcript, call_ai_sentiment, order_items, scheduled_at, call_note, call_fail_reason);
  created_order_id := NULLIF(completion ->> 'order_id', '')::UUID;
  IF delivery_address_snapshot IS NOT NULL THEN
    IF created_order_id IS NULL THEN RAISE EXCEPTION 'Call completion did not return the created order'; END IF;
    UPDATE public.orders SET delivery_address_snapshot = delivery_address_snapshot WHERE id = created_order_id AND workspace_id = active_workspace_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Call completion address could not be saved'; END IF;
  END IF;
  completion := completion || jsonb_build_object('lead_id', active_lead_id, 'lead_name', active_lead_name);
  UPDATE public.call_completion_requests SET result = completion, call_id = NULLIF(completion ->> 'call_id', '')::UUID, order_id = created_order_id WHERE workspace_id = active_workspace_id AND call_completion_requests.completion_key = request_key;
  RETURN completion;
END;
$function$;
