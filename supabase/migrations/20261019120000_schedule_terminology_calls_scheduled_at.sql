-- Schedule vs Callback terminology unification (step B1).
--
-- Renames public.calls.callback_scheduled_at -> public.calls.scheduled_at and the matching
-- RPC parameter callback_scheduled_at -> scheduled_at across the call-completion functions
-- and the workspace call review read model.
--
-- PostgreSQL cannot rename an input parameter in place, so every affected function is
-- dropped and recreated from its current definition with privileges restored. Column and
-- parameter references inside the bodies are renamed together, so no behaviour changes.

ALTER TABLE public.calls RENAME COLUMN callback_scheduled_at TO scheduled_at;

-- Drop dependents first (public wrappers), then private implementations.
DROP FUNCTION IF EXISTS public.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text);
DROP FUNCTION IF EXISTS public.complete_lead_call(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_product_id uuid, order_total_amount numeric, callback_scheduled_at timestamp with time zone);
DROP FUNCTION IF EXISTS public.complete_lead_call_with_order_items(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text);
DROP FUNCTION IF EXISTS public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text);
DROP FUNCTION IF EXISTS public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb);
DROP FUNCTION IF EXISTS private.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text);
DROP FUNCTION IF EXISTS private.complete_lead_call_impl(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_product_id uuid, order_total_amount numeric, callback_scheduled_at timestamp with time zone);
DROP FUNCTION IF EXISTS private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text);
DROP FUNCTION IF EXISTS private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, callback_scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb);

-- Recreate dependencies first (private), then public wrappers.
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
    RAISE EXCEPTION 'Callback date and time are required';
  END IF;
  IF outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Callback time is only valid for Schedule Callback';
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

REVOKE ALL ON FUNCTION private.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO service_role;

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
    RAISE EXCEPTION 'Callback date and time are required';
  END IF;
  IF call_outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Callback time is only valid for Schedule Callback';
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

REVOKE ALL ON FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO service_role;

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
  IF call_outcome = 'followup_scheduled' AND scheduled_at IS NULL THEN RAISE EXCEPTION 'Callback date and time are required'; END IF;
  IF call_outcome <> 'followup_scheduled' AND scheduled_at IS NOT NULL THEN RAISE EXCEPTION 'Callback time is only valid for Schedule Callback'; END IF;
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

REVOKE ALL ON FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb) TO service_role;

CREATE OR REPLACE FUNCTION private.get_workspace_call_review_detail(target_call_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  WITH target AS (
    SELECT
      call_row.*,
      lead_row.full_name AS lead_name,
      operator_profile.full_name AS operator_name
    FROM public.calls AS call_row
    LEFT JOIN public.leads AS lead_row
      ON lead_row.id = call_row.lead_id
     AND lead_row.workspace_id = call_row.workspace_id
    LEFT JOIN public.profiles AS operator_profile
      ON operator_profile.id = call_row.agent_id
    WHERE call_row.id = target_call_id
      AND private.can_view_direct_workspace_call_review(call_row.workspace_id, call_row.id)
  )
  SELECT jsonb_build_object(
    'call', jsonb_build_object(
      'id', target.id,
      'workspace_id', target.workspace_id,
      'lead_id', target.lead_id,
      'agent_id', target.agent_id,
      'duration_seconds', target.duration_seconds,
      'outcome', target.outcome,
      'fail_reason', target.fail_reason,
      'operator_note', target.operator_note,
      'scheduled_at', target.scheduled_at,
      'transcript', target.transcript,
      'created_at', target.created_at
    ),
    'customer', CASE WHEN target.lead_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', target.lead_id,
      'name', target.lead_name
    ) END,
    'operator', CASE WHEN target.agent_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', target.agent_id,
      'name', target.operator_name
    ) END,
    'session', (
      SELECT jsonb_build_object(
        'provider', session.provider,
        'script_source', session.script_source,
        'script_product_id', session.script_product_id,
        'script_product_title', session.script_product_title,
        'script_version_id', session.script_version_id,
        'script_version_number', session.script_version_number,
        'script_snapshot_html', session.script_snapshot_html,
        'script_captured_at', session.script_captured_at
      )
      FROM public.telephony_call_sessions AS session
      WHERE session.completed_call_id = target.id
        AND session.workspace_id = target.workspace_id
      LIMIT 1
    ),
    'revisions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', revision.id,
        'call_id', revision.call_id,
        'revision_number', revision.revision_number,
        'verdict', revision.verdict,
        'coaching_note', revision.coaching_note,
        'correction_reason', revision.correction_reason,
        'reviewer_id', revision.reviewer_id,
        'reviewer_name', reviewer.full_name,
        'supersedes_revision_id', revision.supersedes_revision_id,
        'created_at', revision.created_at
      ) ORDER BY revision.revision_number ASC)
      FROM public.call_review_revisions AS revision
      LEFT JOIN public.profiles AS reviewer
        ON reviewer.id = revision.reviewer_id
      WHERE revision.call_id = target.id
        AND revision.workspace_id = target.workspace_id
    ), '[]'::jsonb),
    'can_review', private.can_access_call_review(target.workspace_id, target.id)
  )
  FROM target;
$function$;

REVOKE ALL ON FUNCTION private.get_workspace_call_review_detail(target_call_id uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_workspace_call_review_detail(target_call_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_workspace_call_review_detail(target_call_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb DEFAULT NULL::jsonb, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, call_note text DEFAULT NULL::text, call_fail_reason text DEFAULT NULL::text)
 RETURNS TABLE(call_id uuid, order_id uuid, lead_status text)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT *
  FROM private.complete_call_with_order_items_idempotent(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
  );
$function$;

REVOKE ALL ON FUNCTION public.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order_items_idempotent(completion_key uuid, call_session_id uuid, lead_id uuid, duration_seconds integer, outcome text, transcript text, ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_lead_call(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_product_id uuid DEFAULT NULL::uuid, order_total_amount numeric DEFAULT NULL::numeric, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  SELECT private.complete_lead_call_impl(
    target_queue_item_id,
    call_duration_seconds,
    call_outcome,
    call_transcript,
    call_ai_sentiment,
    order_product_id,
    order_total_amount,
    scheduled_at
  );
$function$;

REVOKE ALL ON FUNCTION public.complete_lead_call(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_product_id uuid, order_total_amount numeric, scheduled_at timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_product_id uuid, order_total_amount numeric, scheduled_at timestamp with time zone) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb DEFAULT NULL::jsonb, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, call_note text DEFAULT NULL::text, call_fail_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  current_team_id UUID;
  target_lead_id UUID;
  p4_team_id UUID;
  cooldown_interval INTERVAL := INTERVAL '24 hours';
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
    scheduled_at
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

  -- Mark at-risk pickup order as called if this lead has a package at pickup location
  UPDATE public.orders
  SET pickup_call_completed_at = clock_timestamp()
  WHERE lead_id = target_lead_id
    AND workspace_id = active_workspace_id
    AND package_location IS NOT NULL
    AND pickup_call_completed_at IS NULL;

  -- P4 Recycling: all recyclable objections route to P4 on the next day (24 hours cooldown)
  IF call_outcome = 'objection' AND call_fail_reason IN ('unsuccessful_sale', 'needs_time', 'price', 'distrust', 'alternative_solution', 'other') THEN
    cooldown_interval := INTERVAL '24 hours';

    -- Look up P4 department team
    SELECT t.id INTO p4_team_id
    FROM public.teams AS t
    WHERE t.workspace_id = active_workspace_id
      AND (t.slug = 'p4' OR lower(t.name) LIKE '%p4%')
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
$function$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items(target_queue_item_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb DEFAULT NULL::jsonb, scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, call_note text DEFAULT NULL::text, call_fail_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT private.complete_lead_call_with_order_items_idempotent(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
  );
$function$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT private.complete_lead_call_with_order_items_idempotent(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
  );
$function$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(completion_key uuid, target_queue_item_id uuid, call_session_id uuid, call_duration_seconds integer, call_outcome text, call_transcript text, call_ai_sentiment text, order_items jsonb, scheduled_at timestamp with time zone, call_note text, call_fail_reason text, delivery_address_snapshot jsonb) TO service_role;

