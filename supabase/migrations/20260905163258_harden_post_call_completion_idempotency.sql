-- Durable completion deduplication for both supported post-call boundaries.
-- The request row is written in the same transaction as the call/order/queue
-- mutation. A retry therefore reads the original result instead of running a
-- second outcome, callback transition, or order insert.
CREATE TABLE IF NOT EXISTS public.call_completion_requests (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  completion_key UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, completion_key)
);

CREATE INDEX IF NOT EXISTS call_completion_requests_actor_idx
  ON public.call_completion_requests (actor_id, created_at DESC);

ALTER TABLE public.call_completion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.call_completion_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items_idempotent(
  completion_key UUID,
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
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  request_key UUID := completion_key;
  existing_result JSONB;
  completion JSONB;
BEGIN
  IF current_user_id IS NULL OR request_key IS NULL THEN
    RAISE EXCEPTION 'Completion identity is required';
  END IF;

  SELECT queue_item.workspace_id
  INTO active_workspace_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.id = target_queue_item_id;

  IF active_workspace_id IS NULL OR NOT private.is_workspace_member(active_workspace_id) THEN
    RAISE EXCEPTION 'Lead assignment does not belong to the active workspace';
  END IF;

  SELECT request.result
  INTO existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
    AND request.actor_id = current_user_id
  FOR UPDATE;

  IF existing_result IS NOT NULL THEN
    RETURN existing_result;
  END IF;

  INSERT INTO public.call_completion_requests (workspace_id, completion_key, actor_id)
  VALUES (active_workspace_id, request_key, current_user_id)
  ON CONFLICT (workspace_id, completion_key) DO NOTHING;

  SELECT request.result
  INTO existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
    AND request.actor_id = current_user_id
  FOR UPDATE;

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

  UPDATE public.call_completion_requests
  SET result = completion,
      call_id = NULLIF(completion ->> 'call_id', '')::UUID,
      order_id = NULLIF(completion ->> 'order_id', '')::UUID
  WHERE workspace_id = active_workspace_id
    AND call_completion_requests.completion_key = request_key
    AND actor_id = current_user_id;

  RETURN completion;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;

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
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  request_key UUID := completion_key;
  existing_result JSONB;
  completion RECORD;
BEGIN
  IF current_user_id IS NULL OR request_key IS NULL OR call_session_id IS NULL THEN
    RAISE EXCEPTION 'Completion identity is required';
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

  SELECT session.workspace_id
  INTO active_workspace_id
  FROM public.telephony_call_sessions AS session
  WHERE session.id = call_session_id
    AND session.lead_id = complete_call_with_order_items_idempotent.lead_id
    AND session.operator_id = current_user_id
    AND session.status IN ('connected', 'ended');

  IF active_workspace_id IS NULL OR NOT private.is_workspace_member(active_workspace_id) THEN
    RAISE EXCEPTION 'Call session is not available to the authenticated operator';
  END IF;

  SELECT request.result
  INTO existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
    AND request.actor_id = current_user_id
  FOR UPDATE;

  IF existing_result IS NOT NULL THEN
    RETURN QUERY SELECT
      NULLIF(existing_result ->> 'call_id', '')::UUID,
      NULLIF(existing_result ->> 'order_id', '')::UUID,
      existing_result ->> 'lead_status';
    RETURN;
  END IF;

  INSERT INTO public.call_completion_requests (workspace_id, completion_key, actor_id)
  VALUES (active_workspace_id, request_key, current_user_id)
  ON CONFLICT (workspace_id, completion_key) DO NOTHING;

  SELECT request.result
  INTO existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
    AND request.actor_id = current_user_id
  FOR UPDATE;

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
    complete_call_with_order_items_idempotent.lead_id,
    duration_seconds,
    outcome,
    transcript,
    ai_sentiment,
    order_items
  );

  UPDATE public.calls
  SET operator_note = NULLIF(btrim(call_note), ''),
      fail_reason = call_fail_reason
  WHERE public.calls.id = completion.call_id
    AND public.calls.workspace_id = active_workspace_id
    AND public.calls.agent_id = current_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Call completion details could not be saved'; END IF;

  IF callback_scheduled_at IS NOT NULL THEN
    UPDATE public.telephony_call_sessions
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'callback_scheduled_at', callback_scheduled_at
    ),
        updated_at = NOW()
    WHERE id = call_session_id
      AND workspace_id = active_workspace_id
      AND operator_id = current_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Callback details could not be saved'; END IF;
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
    AND call_completion_requests.completion_key = request_key
    AND actor_id = current_user_id;

  RETURN QUERY SELECT completion.call_id, completion.order_id, completion.lead_status;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
