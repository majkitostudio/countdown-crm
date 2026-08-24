-- Keep a started call owned by its Operator until an explicit post-call
-- outcome is persisted. A lease expiry during an active call becomes an
-- auditable recovery state instead of returning the lead to the pool.

ALTER TABLE public.lead_queue_items
  ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.lead_queue_items
  DROP CONSTRAINT IF EXISTS lead_queue_items_state_check;
ALTER TABLE public.lead_queue_items
  ADD CONSTRAINT lead_queue_items_state_check CHECK (
    state IN ('available', 'assigned', 'in_progress', 'awaiting_outcome', 'waiting_callback', 'closed', 'paused')
  );

ALTER TABLE public.lead_queue_items
  DROP CONSTRAINT IF EXISTS lead_queue_items_check;
ALTER TABLE public.lead_queue_items
  ADD CONSTRAINT lead_queue_items_check CHECK (
    (state IN ('assigned', 'in_progress', 'awaiting_outcome') AND assigned_operator_id IS NOT NULL)
    OR (state IN ('available', 'waiting_callback', 'closed', 'paused') AND assigned_operator_id IS NULL)
  );

ALTER TABLE public.lead_queue_events
  DROP CONSTRAINT IF EXISTS lead_queue_events_event_type_check;
ALTER TABLE public.lead_queue_events
  ADD CONSTRAINT lead_queue_events_event_type_check CHECK (event_type IN (
    'created', 'claimed', 'started', 'heartbeat', 'completed', 'released',
    'reassigned', 'callback_scheduled', 'requeued', 'lease_expired',
    'interrupted', 'outcome_pending', 'reopened', 'paused'
  ));

DROP INDEX IF EXISTS public.lead_queue_one_current_per_operator_idx;
CREATE UNIQUE INDEX lead_queue_one_current_per_operator_idx
  ON public.lead_queue_items (workspace_id, assigned_operator_id)
  WHERE state IN ('assigned', 'in_progress', 'awaiting_outcome');

DROP POLICY IF EXISTS "Workspace members can view permitted queue items" ON public.lead_queue_items;
CREATE POLICY "Workspace members can view permitted queue items"
  ON public.lead_queue_items
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      assigned_operator_id = (SELECT auth.uid())
      AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
      AND private.is_workspace_member(workspace_id)
    )
    OR (
      preferred_operator_id = (SELECT auth.uid())
      AND state = 'waiting_callback'
      AND private.is_workspace_member(workspace_id)
    )
  );

CREATE OR REPLACE FUNCTION private.queue_snapshot(target_queue_item_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT jsonb_build_object(
    'queue_item_id', queue_item.id,
    'workspace_id', queue_item.workspace_id,
    'lead_id', queue_item.lead_id,
    'assignment_state', queue_item.state,
    'assigned_operator_id', queue_item.assigned_operator_id,
    'preferred_operator_id', queue_item.preferred_operator_id,
    'available_at', queue_item.available_at,
    'scheduled_at', queue_item.scheduled_at,
    'attempt_count', queue_item.attempt_count,
    'claimed_at', queue_item.claimed_at,
    'last_heartbeat_at', queue_item.last_heartbeat_at,
    'lease_expires_at', queue_item.lease_expires_at,
    'call_started_at', queue_item.call_started_at,
    'call_ended_at', queue_item.call_ended_at,
    'recovery_required', queue_item.recovery_required,
    'lead', jsonb_build_object(
      'id', lead.id,
      'workspace_id', lead.workspace_id,
      'full_name', lead.full_name,
      'phone', lead.phone,
      'email', lead.email,
      'city', lead.city,
      'company', lead.company,
      'country', lead.country,
      'status', lead.status,
      'ai_score', lead.ai_score,
      'notes', lead.notes,
      'created_at', lead.created_at,
      'updated_at', lead.updated_at
    )
  )
  FROM public.lead_queue_items AS queue_item
  JOIN public.leads AS lead ON lead.id = queue_item.lead_id
  WHERE queue_item.id = target_queue_item_id;
$$;

CREATE OR REPLACE FUNCTION private.release_expired_operator_assignment(
  target_workspace_id UUID,
  target_operator_id UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  expired_item RECORD;
BEGIN
  SELECT * INTO expired_item
  FROM public.lead_queue_items
  WHERE workspace_id = target_workspace_id
    AND assigned_operator_id = target_operator_id
    AND state IN ('assigned', 'in_progress')
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < NOW()
  FOR UPDATE;

  IF expired_item.id IS NULL THEN RETURN; END IF;

  IF expired_item.state = 'in_progress' THEN
    UPDATE public.lead_queue_items
    SET state = 'awaiting_outcome',
        recovery_required = TRUE,
        call_ended_at = COALESCE(call_ended_at, NOW()),
        lease_expires_at = NULL,
        last_heartbeat_at = NOW(),
        updated_at = NOW()
    WHERE id = expired_item.id;

    UPDATE public.operator_presence
    SET state = 'after_call', last_heartbeat_at = NOW(), updated_at = NOW()
    WHERE workspace_id = target_workspace_id AND operator_id = target_operator_id;

    PERFORM private.record_queue_event(
      expired_item.id, 'interrupted', 'in_progress', 'awaiting_outcome',
      target_operator_id, target_operator_id, target_operator_id,
      'Active call interrupted; operator recovery required',
      jsonb_build_object('recovery_required', TRUE)
    );
  ELSE
    UPDATE public.lead_queue_items
    SET state = 'available', assigned_operator_id = NULL,
        available_at = NOW(), scheduled_at = NULL,
        lease_expires_at = NULL, released_at = NOW(), updated_at = NOW()
    WHERE id = expired_item.id;

    UPDATE public.operator_presence
    SET state = 'available', last_heartbeat_at = NOW(), updated_at = NOW()
    WHERE workspace_id = target_workspace_id AND operator_id = target_operator_id;

    PERFORM private.record_queue_event(
      expired_item.id, 'lease_expired', expired_item.state, 'available',
      expired_item.assigned_operator_id, NULL, target_operator_id,
      'Assignment lease expired', '{}'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_next_lead_impl(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  candidate_id UUID;
  current_item RECORD;
  candidate_item RECORD;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only Operators can claim queue work'; END IF;

  PERFORM private.release_expired_operator_assignment(target_workspace_id, current_user_id);

  SELECT * INTO current_item
  FROM public.lead_queue_items
  WHERE workspace_id = target_workspace_id
    AND assigned_operator_id = current_user_id
    AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
  FOR UPDATE;
  IF current_item.id IS NOT NULL THEN RETURN private.queue_snapshot(current_item.id); END IF;

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
    AND queue_item.state IN ('available', 'waiting_callback')
    AND queue_item.available_at <= NOW()
    AND (queue_item.scheduled_at IS NULL OR queue_item.scheduled_at <= NOW())
    AND (
      queue_item.preferred_operator_id IS NULL
      OR queue_item.preferred_operator_id = current_user_id
      OR NOT EXISTS (
        SELECT 1 FROM public.operator_presence AS preferred_presence
        WHERE preferred_presence.workspace_id = target_workspace_id
          AND preferred_presence.operator_id = queue_item.preferred_operator_id
          AND preferred_presence.state = 'available'
          AND preferred_presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
      )
      OR EXISTS (
        SELECT 1 FROM public.lead_queue_items AS preferred_assignment
        WHERE preferred_assignment.workspace_id = target_workspace_id
          AND preferred_assignment.assigned_operator_id = queue_item.preferred_operator_id
          AND preferred_assignment.state IN ('assigned', 'in_progress', 'awaiting_outcome')
      )
    )
  ORDER BY
    CASE WHEN queue_item.state = 'waiting_callback' THEN 0 ELSE 1 END,
    CASE WHEN queue_item.preferred_operator_id = current_user_id THEN 0 ELSE 1 END,
    queue_item.priority DESC,
    COALESCE(queue_item.scheduled_at, queue_item.available_at) ASC,
    queue_item.created_at ASC, queue_item.id ASC
  FOR UPDATE SKIP LOCKED LIMIT 1;
  IF candidate_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO candidate_item FROM public.lead_queue_items WHERE id = candidate_id FOR UPDATE;
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
$$;

CREATE OR REPLACE FUNCTION private.get_current_lead_impl(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  current_item RECORD;
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only an Operator member can view current queue work'; END IF;

  PERFORM private.release_expired_operator_assignment(target_workspace_id, current_user_id);

  SELECT * INTO current_item
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.assigned_operator_id = current_user_id
    AND (
      queue_item.state IN ('assigned', 'awaiting_outcome')
      OR (queue_item.state = 'in_progress' AND (queue_item.lease_expires_at IS NULL OR queue_item.lease_expires_at > NOW()))
    )
  LIMIT 1;
  IF current_item.id IS NULL THEN RETURN NULL; END IF;

  -- A fresh page/login has no trustworthy browser call session. Preserve the
  -- lead and require explicit recovery rather than exposing it as callable.
  IF current_item.state = 'in_progress' THEN
    UPDATE public.lead_queue_items
    SET state = 'awaiting_outcome', recovery_required = TRUE,
        call_ended_at = COALESCE(call_ended_at, NOW()),
        lease_expires_at = NULL, last_heartbeat_at = NOW(), updated_at = NOW()
    WHERE id = current_item.id;
    UPDATE public.operator_presence
    SET state = 'after_call', last_heartbeat_at = NOW(), updated_at = NOW()
    WHERE workspace_id = current_item.workspace_id AND operator_id = current_user_id;
    PERFORM private.record_queue_event(
      current_item.id, 'interrupted', 'in_progress', 'awaiting_outcome',
      current_user_id, current_user_id, current_user_id,
      'Current call requires recovery after page or session re-entry',
      jsonb_build_object('recovery_required', TRUE)
    );
  END IF;

  RETURN private.queue_snapshot(current_item.id);
END;
$$;

CREATE OR REPLACE FUNCTION private.start_lead_call_impl(target_queue_item_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
BEGIN
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id AND state = 'assigned'
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead assignment is not available for call'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only an Operator member can start queue work'; END IF;
  IF queue_item.lease_expires_at IS NOT NULL AND queue_item.lease_expires_at < NOW() THEN
    RAISE EXCEPTION 'Lead assignment has expired';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.operator_presence AS presence
    WHERE presence.workspace_id = queue_item.workspace_id
      AND presence.operator_id = current_user_id AND presence.state = 'available'
      AND presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
  ) THEN RAISE EXCEPTION 'Operator is not available for a call'; END IF;

  UPDATE public.lead_queue_items
  SET state = 'in_progress', last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '60 minutes',
      call_started_at = NOW(), call_ended_at = NULL,
      recovery_required = FALSE, updated_at = NOW()
  WHERE id = target_queue_item_id;
  UPDATE public.operator_presence
  SET state = 'in_call', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;
  PERFORM private.record_queue_event(
    target_queue_item_id, 'started', 'assigned', 'in_progress',
    current_user_id, current_user_id, current_user_id, NULL, '{}'
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.heartbeat_lead_assignment_impl(target_queue_item_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
  next_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id
    AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead assignment is not active'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only an Operator member can heartbeat queue work'; END IF;

  IF queue_item.state = 'awaiting_outcome' THEN
    UPDATE public.lead_queue_items SET last_heartbeat_at = NOW(), updated_at = NOW() WHERE id = target_queue_item_id;
  ELSE
    IF queue_item.lease_expires_at IS NOT NULL AND queue_item.lease_expires_at < NOW() THEN
      RAISE EXCEPTION 'Lead assignment has expired';
    END IF;
    next_expiry := NOW() + CASE WHEN queue_item.state = 'in_progress' THEN INTERVAL '60 minutes' ELSE INTERVAL '10 minutes' END;
    UPDATE public.lead_queue_items
    SET last_heartbeat_at = NOW(), lease_expires_at = next_expiry, updated_at = NOW()
    WHERE id = target_queue_item_id;
  END IF;

  UPDATE public.operator_presence SET last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;
  RETURN jsonb_build_object('queue_item_id', target_queue_item_id, 'lease_expires_at', next_expiry);
END;
$$;

CREATE OR REPLACE FUNCTION private.end_lead_call_impl(target_queue_item_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
BEGIN
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead assignment is not owned by this Operator'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only an Operator member can end queue work'; END IF;
  IF queue_item.state = 'awaiting_outcome' THEN RETURN private.queue_snapshot(target_queue_item_id); END IF;
  IF queue_item.state <> 'in_progress' THEN RAISE EXCEPTION 'Only an active call can be ended'; END IF;

  UPDATE public.lead_queue_items
  SET state = 'awaiting_outcome', call_ended_at = NOW(),
      lease_expires_at = NULL, last_heartbeat_at = NOW(),
      recovery_required = FALSE, updated_at = NOW()
  WHERE id = target_queue_item_id;
  UPDATE public.operator_presence
  SET state = 'after_call', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;
  PERFORM private.record_queue_event(
    target_queue_item_id, 'outcome_pending', 'in_progress', 'awaiting_outcome',
    current_user_id, current_user_id, current_user_id,
    'Call ended; explicit outcome required', '{}'
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.abort_lead_call_start_impl(
  target_queue_item_id UUID,
  abort_reason TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
BEGIN
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
    AND assigned_operator_id = current_user_id
    AND state = 'in_progress'
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead call start cannot be aborted for this assignment'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Only an Operator member can abort queue work'; END IF;

  UPDATE public.lead_queue_items
  SET state = 'assigned', last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      call_started_at = NULL, call_ended_at = NULL,
      recovery_required = FALSE, updated_at = NOW()
  WHERE id = target_queue_item_id;
  UPDATE public.operator_presence SET state = 'available', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;
  PERFORM private.record_queue_event(
    target_queue_item_id, 'requeued', 'in_progress', 'assigned',
    current_user_id, current_user_id, current_user_id,
    NULLIF(TRIM(abort_reason), ''), '{}'
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

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

  INSERT INTO public.calls (workspace_id, lead_id, agent_id, duration_seconds, outcome, transcript, ai_sentiment)
  VALUES (queue_item.workspace_id, queue_item.lead_id, current_user_id, effective_duration_seconds,
          CASE WHEN call_outcome = 'objection' THEN 'objection' ELSE call_outcome END,
          call_transcript, COALESCE(NULLIF(call_ai_sentiment, ''), 'Neutral'))
  RETURNING id INTO call_id;

  IF order_product_id IS NOT NULL THEN
    INSERT INTO public.orders (workspace_id, lead_id, product_id, agent_id, total_amount, status)
    VALUES (queue_item.workspace_id, queue_item.lead_id, order_product_id, current_user_id, order_total_amount, 'completed')
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

CREATE OR REPLACE FUNCTION private.release_lead_assignment_impl(target_queue_item_id UUID, release_reason TEXT)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
BEGIN
  SELECT * INTO queue_item FROM public.lead_queue_items WHERE id = target_queue_item_id FOR UPDATE;
  IF queue_item.id IS NULL OR NOT private.is_workspace_manager_or_admin(queue_item.workspace_id) THEN
    RAISE EXCEPTION 'Queue item is not available for release';
  END IF;
  IF queue_item.state = 'in_progress' THEN RAISE EXCEPTION 'Active calls must be completed before release'; END IF;

  UPDATE public.lead_queue_items
  SET state = 'available', assigned_operator_id = NULL, preferred_operator_id = NULL,
      available_at = NOW(), scheduled_at = NULL, lease_expires_at = NULL,
      last_heartbeat_at = NULL, released_at = NOW(), recovery_required = FALSE, updated_at = NOW()
  WHERE id = target_queue_item_id;
  UPDATE public.operator_presence SET state = 'available', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = queue_item.assigned_operator_id
    AND state IN ('in_call', 'after_call');
  PERFORM private.record_queue_event(
    target_queue_item_id, 'released', queue_item.state, 'available',
    queue_item.assigned_operator_id, NULL, current_user_id,
    NULLIF(TRIM(release_reason), ''), jsonb_build_object('recovery_required', queue_item.recovery_required)
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.reassign_lead_assignment_impl(
  target_queue_item_id UUID, target_operator_id UUID, reassignment_reason TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
BEGIN
  SELECT * INTO queue_item FROM public.lead_queue_items WHERE id = target_queue_item_id FOR UPDATE;
  IF queue_item.id IS NULL OR NOT private.is_workspace_manager_or_admin(queue_item.workspace_id) THEN
    RAISE EXCEPTION 'Queue item is not available for reassignment';
  END IF;
  IF queue_item.state IN ('in_progress', 'awaiting_outcome') THEN
    RAISE EXCEPTION 'Active or recovery calls cannot be reassigned';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id AND member.user_id = target_operator_id AND member.role = 'operator'
  ) THEN RAISE EXCEPTION 'Target user is not an Operator in this workspace'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.lead_queue_items AS active_item
    WHERE active_item.workspace_id = queue_item.workspace_id
      AND active_item.assigned_operator_id = target_operator_id
      AND active_item.state IN ('assigned', 'in_progress', 'awaiting_outcome')
  ) THEN RAISE EXCEPTION 'Target Operator already has an active lead'; END IF;

  UPDATE public.lead_queue_items
  SET state = 'assigned', assigned_operator_id = target_operator_id, preferred_operator_id = NULL,
      claimed_at = NOW(), last_heartbeat_at = NOW(), lease_expires_at = NOW() + INTERVAL '10 minutes',
      scheduled_at = NULL, recovery_required = FALSE, call_started_at = NULL, call_ended_at = NULL, updated_at = NOW()
  WHERE id = target_queue_item_id;
  PERFORM private.record_queue_event(
    target_queue_item_id, 'reassigned', queue_item.state, 'assigned',
    queue_item.assigned_operator_id, target_operator_id, current_user_id,
    NULLIF(TRIM(reassignment_reason), ''), '{}'
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_lead_call(target_queue_item_id UUID)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.end_lead_call_impl(target_queue_item_id); $$;

REVOKE ALL ON FUNCTION public.end_lead_call(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_lead_call(UUID) TO authenticated;
