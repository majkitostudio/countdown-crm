-- Finalize the post-call boundary after the first idempotency implementation.
-- Every completion is keyed by the server-created telephony session for one
-- call attempt. The fingerprint prevents reusing that identity with a
-- different payload, while the ledger row remains in the same transaction as
-- the business mutation.

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS callback_scheduled_at TIMESTAMPTZ;

ALTER TABLE public.call_completion_requests
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE public.call_completion_requests
SET request_fingerprint = COALESCE(request_fingerprint, 'legacy');

ALTER TABLE public.call_completion_requests
  ALTER COLUMN request_fingerprint SET NOT NULL;

ALTER TABLE public.telephony_call_sessions
  DROP CONSTRAINT IF EXISTS telephony_call_sessions_provider_check;
ALTER TABLE public.telephony_call_sessions
  ADD CONSTRAINT telephony_call_sessions_provider_check
  CHECK (provider IN ('simulation', 'telnyx', 'local_sip'));

ALTER TABLE public.telephony_call_events
  DROP CONSTRAINT IF EXISTS telephony_call_events_provider_check;
ALTER TABLE public.telephony_call_events
  ADD CONSTRAINT telephony_call_events_provider_check
  CHECK (provider IN ('simulation', 'telnyx', 'local_sip'));

DROP FUNCTION IF EXISTS public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items_idempotent(
  completion_key UUID,
  target_queue_item_id UUID,
  call_session_id UUID,
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
SET search_path = public, private, pg_temp
AS $$
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
  IF call_outcome = 'followup_scheduled' AND callback_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Callback date and time are required';
  END IF;
  IF call_outcome <> 'followup_scheduled' AND callback_scheduled_at IS NOT NULL THEN
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
    'callback_scheduled_at', callback_scheduled_at,
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
    callback_scheduled_at,
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
$$;

CREATE OR REPLACE FUNCTION public.complete_call_with_order_items_idempotent(
  completion_key UUID,
  call_session_id UUID,
  lead_id UUID,
  duration_seconds INTEGER,
  outcome TEXT,
  transcript TEXT,
  ai_sentiment TEXT,
  order_items JSONB DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  call_note TEXT DEFAULT NULL,
  call_fail_reason TEXT DEFAULT NULL
)
RETURNS TABLE (call_id UUID, order_id UUID, lead_status TEXT)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
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
  IF outcome = 'followup_scheduled' AND callback_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Callback date and time are required';
  END IF;
  IF outcome <> 'followup_scheduled' AND callback_scheduled_at IS NOT NULL THEN
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
    'callback_scheduled_at', callback_scheduled_at,
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
      callback_scheduled_at = $9
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
$$;

-- Only the two fingerprinted boundaries remain callable through the Data API.
REVOKE ALL ON FUNCTION public.complete_call_with_order(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_call_with_order_items(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_lead_call(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items_idempotent(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_call_with_order_items_idempotent(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order_items_idempotent(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
