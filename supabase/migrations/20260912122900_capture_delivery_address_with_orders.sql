-- Keep the original RPC signatures available for already deployed clients. New
-- overloads accept the immutable address snapshot and include it in the same
-- transaction and idempotency boundary as the order itself.
CREATE FUNCTION public.create_order_with_items(
  p_workspace_id UUID,
  p_lead_id UUID,
  p_items JSONB,
  p_order_source TEXT,
  p_source_note TEXT,
  p_status TEXT,
  p_delivery_address_snapshot JSONB
)
RETURNS SETOF public.orders
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  created_order public.orders;
BEGIN
  IF p_delivery_address_snapshot IS NULL
     OR jsonb_typeof(p_delivery_address_snapshot) <> 'object'
     OR NOT p_delivery_address_snapshot ?& ARRAY['recipient_name', 'line1', 'city', 'postal_code', 'country'] THEN
    RAISE EXCEPTION 'A complete delivery address is required';
  END IF;

  SELECT * INTO created_order
  FROM public.create_order_with_items(
    p_workspace_id, p_lead_id, p_items, p_order_source, p_source_note, p_status
  );

  UPDATE public.orders
  SET delivery_address_snapshot = p_delivery_address_snapshot
  WHERE id = created_order.id
    AND workspace_id = p_workspace_id;

  RETURN NEXT created_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items(UUID, UUID, JSONB, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(UUID, UUID, JSONB, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

CREATE FUNCTION private.complete_lead_call_with_order_items_idempotent(
  completion_key UUID,
  target_queue_item_id UUID,
  call_session_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB,
  callback_scheduled_at TIMESTAMPTZ,
  call_note TEXT,
  call_fail_reason TEXT,
  delivery_address_snapshot JSONB
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
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
  created_order_id UUID;
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
  IF order_items IS NOT NULL AND jsonb_typeof(order_items) = 'array' AND jsonb_array_length(order_items) > 0 THEN
    IF delivery_address_snapshot IS NULL
       OR jsonb_typeof(delivery_address_snapshot) <> 'object'
       OR NOT delivery_address_snapshot ?& ARRAY['recipient_name', 'line1', 'city', 'postal_code', 'country'] THEN
      RAISE EXCEPTION 'A complete delivery address is required';
    END IF;
  ELSIF delivery_address_snapshot IS NOT NULL THEN
    RAISE EXCEPTION 'A delivery address is only valid for an order call';
  END IF;

  SELECT queue_item.workspace_id, queue_item.lead_id, lead.full_name
  INTO active_workspace_id, active_lead_id, active_lead_name
  FROM public.telephony_call_sessions AS session
  JOIN public.lead_queue_items AS queue_item ON queue_item.id = session.queue_item_id
  JOIN public.leads AS lead ON lead.id = queue_item.lead_id
  WHERE session.id = call_session_id
    AND session.queue_item_id = target_queue_item_id
    AND session.lead_id = queue_item.lead_id
    AND session.operator_id = current_user_id
    AND session.status IN ('connected', 'ended');

  IF active_workspace_id IS NULL
     OR active_lead_id IS NULL
     OR NOT private.is_workspace_member(active_workspace_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.workspace_members AS member
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
    'call_fail_reason', call_fail_reason,
    'delivery_address_snapshot', delivery_address_snapshot
  )::TEXT);

  SELECT request.actor_id, request.request_fingerprint, request.result
  INTO existing_actor_id, existing_fingerprint, existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
  FOR UPDATE;

  IF FOUND THEN
    IF existing_actor_id <> current_user_id THEN RAISE EXCEPTION 'Completion identity belongs to another operator'; END IF;
    IF existing_fingerprint <> request_fingerprint THEN RAISE EXCEPTION 'Completion request key was reused with a different payload'; END IF;
    IF existing_result IS NULL THEN RAISE EXCEPTION 'Completion request is still incomplete'; END IF;
    RETURN existing_result;
  END IF;

  INSERT INTO public.call_completion_requests (workspace_id, completion_key, actor_id, request_fingerprint)
  VALUES (active_workspace_id, request_key, current_user_id, request_fingerprint)
  ON CONFLICT DO NOTHING;

  SELECT request.actor_id, request.request_fingerprint, request.result
  INTO existing_actor_id, existing_fingerprint, existing_result
  FROM public.call_completion_requests AS request
  WHERE request.workspace_id = active_workspace_id
    AND request.completion_key = request_key
  FOR UPDATE;

  IF existing_actor_id <> current_user_id THEN RAISE EXCEPTION 'Completion identity belongs to another operator'; END IF;
  IF existing_fingerprint <> request_fingerprint THEN RAISE EXCEPTION 'Completion request key was reused with a different payload'; END IF;
  IF existing_result IS NOT NULL THEN RETURN existing_result; END IF;

  completion := public.complete_lead_call_with_order_items(
    target_queue_item_id, call_duration_seconds, call_outcome, call_transcript,
    call_ai_sentiment, order_items, callback_scheduled_at, call_note, call_fail_reason
  );
  created_order_id := NULLIF(completion ->> 'order_id', '')::UUID;
  IF delivery_address_snapshot IS NOT NULL THEN
    IF created_order_id IS NULL THEN RAISE EXCEPTION 'Call completion did not return the created order'; END IF;
    UPDATE public.orders
    SET delivery_address_snapshot = delivery_address_snapshot
    WHERE id = created_order_id
      AND workspace_id = active_workspace_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Call completion address could not be saved'; END IF;
  END IF;

  completion := completion || jsonb_build_object('lead_id', active_lead_id, 'lead_name', active_lead_name);
  UPDATE public.call_completion_requests
  SET result = completion, call_id = NULLIF(completion ->> 'call_id', '')::UUID, order_id = created_order_id
  WHERE workspace_id = active_workspace_id
    AND call_completion_requests.completion_key = request_key;

  RETURN completion;
END;
$$;

CREATE FUNCTION public.complete_lead_call_with_order_items_idempotent(
  completion_key UUID,
  target_queue_item_id UUID,
  call_session_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB,
  callback_scheduled_at TIMESTAMPTZ,
  call_note TEXT,
  call_fail_reason TEXT,
  delivery_address_snapshot JSONB
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.complete_lead_call_with_order_items_idempotent(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
  );
$$;

REVOKE ALL ON FUNCTION private.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT, JSONB
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT, JSONB
) TO authenticated;
