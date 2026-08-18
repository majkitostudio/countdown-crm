-- Countdown CRM: server-controlled lead queue, assignment, presence and routing.
--
-- Operators never receive a lead directory. They receive one current assignment
-- through the authenticated routing functions below. Direct queue mutations
-- are not granted to the Data API roles.

CREATE TABLE IF NOT EXISTS public.operator_presence (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'offline'
    CHECK (state IN ('offline', 'available', 'break', 'in_call', 'after_call')),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, operator_id)
);

CREATE TABLE IF NOT EXISTS public.lead_queue_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  preferred_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'available'
    CHECK (state IN ('available', 'assigned', 'in_progress', 'waiting_callback', 'closed', 'paused')),
  priority INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  claimed_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  last_outcome TEXT,
  released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, lead_id),
  CHECK (
    (state IN ('assigned', 'in_progress') AND assigned_operator_id IS NOT NULL)
    OR (state IN ('available', 'waiting_callback', 'closed', 'paused') AND assigned_operator_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.lead_queue_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  queue_item_id UUID NOT NULL REFERENCES public.lead_queue_items(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'claimed',
    'started',
    'heartbeat',
    'completed',
    'released',
    'reassigned',
    'callback_scheduled',
    'requeued',
    'lease_expired',
    'reopened',
    'paused'
  )),
  from_state TEXT,
  to_state TEXT NOT NULL,
  from_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_queue_one_current_per_operator_idx
  ON public.lead_queue_items (workspace_id, assigned_operator_id)
  WHERE state IN ('assigned', 'in_progress');

CREATE INDEX IF NOT EXISTS lead_queue_routing_idx
  ON public.lead_queue_items (workspace_id, state, available_at, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS lead_queue_preferred_operator_idx
  ON public.lead_queue_items (workspace_id, preferred_operator_id, state, available_at);

CREATE INDEX IF NOT EXISTS lead_queue_events_item_created_idx
  ON public.lead_queue_events (queue_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lead_queue_events_workspace_created_idx
  ON public.lead_queue_events (workspace_id, created_at DESC);

ALTER TABLE public.operator_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_queue_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.operator_presence, public.lead_queue_items, public.lead_queue_events
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.operator_presence, public.lead_queue_items, public.lead_queue_events
  TO authenticated;

DROP POLICY IF EXISTS "Workspace managers can view operator presence" ON public.operator_presence;
CREATE POLICY "Team Leaders and Administrators can view operator presence"
  ON public.operator_presence
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Operators can view own presence" ON public.operator_presence;
CREATE POLICY "Operators can view own presence"
  ON public.operator_presence
  FOR SELECT TO authenticated
  USING (
    operator_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Workspace managers can view queue items" ON public.lead_queue_items;
CREATE POLICY "Team Leaders and Administrators can view queue items"
  ON public.lead_queue_items
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Operators can view current queue item" ON public.lead_queue_items;
CREATE POLICY "Operators can view current queue item"
  ON public.lead_queue_items
  FOR SELECT TO authenticated
  USING (
    assigned_operator_id = (SELECT auth.uid())
    AND state IN ('assigned', 'in_progress')
    AND private.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Workspace managers can view queue events" ON public.lead_queue_events;
CREATE POLICY "Team Leaders and Administrators can view queue events"
  ON public.lead_queue_events
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

-- Operators use server functions for queue events; they do not receive the
-- event history as a general-purpose browser-readable activity stream.

INSERT INTO public.lead_queue_items (workspace_id, lead_id, state, available_at, completed_at)
SELECT
  lead.workspace_id,
  lead.id,
  CASE WHEN lead.status IN ('customer', 'unresponsive') THEN 'closed' ELSE 'available' END,
  NOW(),
  CASE WHEN lead.status IN ('customer', 'unresponsive') THEN NOW() ELSE NULL END
FROM public.leads AS lead
WHERE lead.workspace_id IS NOT NULL
ON CONFLICT (workspace_id, lead_id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION private.record_queue_event(
  target_queue_item_id UUID,
  target_event_type TEXT,
  target_from_state TEXT,
  target_to_state TEXT,
  target_from_operator_id UUID,
  target_to_operator_id UUID,
  target_actor_id UUID,
  target_reason TEXT DEFAULT NULL,
  target_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  INSERT INTO public.lead_queue_events (
    workspace_id,
    queue_item_id,
    lead_id,
    event_type,
    from_state,
    to_state,
    from_operator_id,
    to_operator_id,
    actor_id,
    reason,
    metadata
  )
  SELECT
    queue_item.workspace_id,
    queue_item.id,
    queue_item.lead_id,
    target_event_type,
    target_from_state,
    target_to_state,
    target_from_operator_id,
    target_to_operator_id,
    target_actor_id,
    target_reason,
    COALESCE(target_metadata, '{}'::jsonb)
  FROM public.lead_queue_items AS queue_item
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
  SELECT *
  INTO expired_item
  FROM public.lead_queue_items
  WHERE workspace_id = target_workspace_id
    AND assigned_operator_id = target_operator_id
    AND state IN ('assigned', 'in_progress')
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < NOW()
  FOR UPDATE;

  IF expired_item.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.lead_queue_items
  SET state = 'available',
      assigned_operator_id = NULL,
      available_at = NOW(),
      scheduled_at = NULL,
      lease_expires_at = NULL,
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = expired_item.id;

  PERFORM private.record_queue_event(
    expired_item.id,
    'lease_expired',
    expired_item.state,
    'available',
    expired_item.assigned_operator_id,
    NULL,
    target_operator_id,
    'Assignment lease expired',
    '{}'::jsonb
  );
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
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only Operators can claim queue work';
  END IF;

  PERFORM private.release_expired_operator_assignment(target_workspace_id, current_user_id);

  SELECT *
  INTO current_item
  FROM public.lead_queue_items
  WHERE workspace_id = target_workspace_id
    AND assigned_operator_id = current_user_id
    AND state IN ('assigned', 'in_progress')
  FOR UPDATE;

  IF current_item.id IS NOT NULL THEN
    RETURN private.queue_snapshot(current_item.id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operator_presence AS presence
    WHERE presence.workspace_id = target_workspace_id
      AND presence.operator_id = current_user_id
      AND presence.state = 'available'
      AND presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Operator is not available for queue work';
  END IF;

  SELECT queue_item.id
  INTO candidate_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.state IN ('available', 'waiting_callback')
    AND queue_item.available_at <= NOW()
    AND (queue_item.scheduled_at IS NULL OR queue_item.scheduled_at <= NOW())
    AND (
      queue_item.preferred_operator_id IS NULL
      OR queue_item.preferred_operator_id = current_user_id
      OR NOT EXISTS (
        SELECT 1
        FROM public.operator_presence AS preferred_presence
        WHERE preferred_presence.workspace_id = target_workspace_id
          AND preferred_presence.operator_id = queue_item.preferred_operator_id
          AND preferred_presence.state = 'available'
          AND preferred_presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
      )
    )
  ORDER BY
    CASE WHEN queue_item.preferred_operator_id = current_user_id THEN 0 ELSE 1 END,
    queue_item.priority DESC,
    queue_item.available_at ASC,
    queue_item.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF candidate_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO candidate_item
  FROM public.lead_queue_items
  WHERE id = candidate_id
  FOR UPDATE;

  UPDATE public.lead_queue_items
  SET state = 'assigned',
      assigned_operator_id = current_user_id,
      claimed_at = NOW(),
      last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      attempt_count = attempt_count + 1,
      released_at = NULL,
      updated_at = NOW()
  WHERE id = candidate_id;

  PERFORM private.record_queue_event(
    candidate_id,
    'claimed',
    candidate_item.state,
    'assigned',
    candidate_item.assigned_operator_id,
    current_user_id,
    current_user_id,
    NULL,
    '{}'::jsonb
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
  current_item_id UUID;
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can view current queue work';
  END IF;

  SELECT queue_item.id
  INTO current_item_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.assigned_operator_id = current_user_id
    AND queue_item.state IN ('assigned', 'in_progress')
    AND (queue_item.lease_expires_at IS NULL OR queue_item.lease_expires_at > NOW())
  LIMIT 1;

  IF current_item_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN private.queue_snapshot(current_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.set_operator_presence_impl(
  target_workspace_id UUID,
  target_state TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
BEGIN
  IF target_state NOT IN ('offline', 'available', 'break', 'in_call', 'after_call') THEN
    RAISE EXCEPTION 'Invalid operator presence state';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only Operators can update operator presence';
  END IF;

  IF target_state NOT IN ('in_call', 'after_call')
     AND EXISTS (
       SELECT 1
       FROM public.lead_queue_items AS queue_item
       WHERE queue_item.workspace_id = target_workspace_id
         AND queue_item.assigned_operator_id = current_user_id
         AND queue_item.state = 'in_progress'
     ) THEN
    RAISE EXCEPTION 'Finish the active call before changing Operator presence';
  END IF;

  INSERT INTO public.operator_presence (workspace_id, operator_id, state, last_heartbeat_at, updated_at)
  VALUES (target_workspace_id, current_user_id, target_state, NOW(), NOW())
  ON CONFLICT (workspace_id, operator_id)
  DO UPDATE SET state = EXCLUDED.state, last_heartbeat_at = NOW(), updated_at = NOW();

  RETURN jsonb_build_object(
    'workspace_id', target_workspace_id,
    'operator_id', current_user_id,
    'state', target_state,
    'last_heartbeat_at', NOW()
  );
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
  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
    AND assigned_operator_id = current_user_id
  FOR UPDATE;

  IF queue_item.id IS NULL OR queue_item.state <> 'assigned' THEN
    RAISE EXCEPTION 'Lead assignment is not available for call';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can start queue work';
  END IF;

  IF queue_item.lease_expires_at IS NOT NULL AND queue_item.lease_expires_at < NOW() THEN
    RAISE EXCEPTION 'Lead assignment has expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operator_presence AS presence
    WHERE presence.workspace_id = queue_item.workspace_id
      AND presence.operator_id = current_user_id
      AND presence.state = 'available'
      AND presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Operator is not available for a call';
  END IF;

  UPDATE public.lead_queue_items
  SET state = 'in_progress',
      last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '60 minutes',
      updated_at = NOW()
  WHERE id = target_queue_item_id;

  UPDATE public.operator_presence
  SET state = 'in_call', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    'started',
    'assigned',
    'in_progress',
    current_user_id,
    current_user_id,
    current_user_id,
    NULL,
    '{}'::jsonb
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
  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
    AND assigned_operator_id = current_user_id
    AND state IN ('assigned', 'in_progress')
  FOR UPDATE;

  IF queue_item.id IS NULL THEN
    RAISE EXCEPTION 'Lead assignment is not active';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can heartbeat queue work';
  END IF;

  IF queue_item.lease_expires_at IS NOT NULL AND queue_item.lease_expires_at < NOW() THEN
    RAISE EXCEPTION 'Lead assignment has expired';
  END IF;

  next_expiry := NOW() + CASE WHEN queue_item.state = 'in_progress' THEN INTERVAL '60 minutes' ELSE INTERVAL '10 minutes' END;

  UPDATE public.lead_queue_items
  SET last_heartbeat_at = NOW(), lease_expires_at = next_expiry, updated_at = NOW()
  WHERE id = target_queue_item_id;

  UPDATE public.operator_presence
  SET last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;

  RETURN jsonb_build_object('queue_item_id', target_queue_item_id, 'lease_expires_at', next_expiry);
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
BEGIN
  IF call_duration_seconds IS NULL OR call_duration_seconds < 0 THEN
    RAISE EXCEPTION 'Call duration must be a non-negative integer';
  END IF;

  IF call_outcome NOT IN ('order_placed', 'followup_scheduled', 'no_answer', 'objection') THEN
    RAISE EXCEPTION 'Unsupported queue call outcome';
  END IF;

  IF (order_product_id IS NULL) <> (order_total_amount IS NULL) THEN
    RAISE EXCEPTION 'Order product and amount must be provided together';
  END IF;

  IF order_total_amount IS NOT NULL AND order_total_amount < 0 THEN
    RAISE EXCEPTION 'Order amount must be non-negative';
  END IF;

  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
    AND assigned_operator_id = current_user_id
    AND state = 'in_progress'
  FOR UPDATE;

  IF queue_item.id IS NULL THEN
    RAISE EXCEPTION 'Lead assignment is not active for this Operator';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can complete queue work';
  END IF;

  IF queue_item.lease_expires_at IS NOT NULL AND queue_item.lease_expires_at < NOW() THEN
    RAISE EXCEPTION 'Lead assignment has expired';
  END IF;

  IF order_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = order_product_id
      AND product.workspace_id = queue_item.workspace_id
  ) THEN
    RAISE EXCEPTION 'Order product does not belong to the active workspace';
  END IF;

  INSERT INTO public.calls (
    workspace_id,
    lead_id,
    agent_id,
    duration_seconds,
    outcome,
    transcript,
    ai_sentiment
  )
  VALUES (
    queue_item.workspace_id,
    queue_item.lead_id,
    current_user_id,
    call_duration_seconds,
    CASE WHEN call_outcome = 'objection' THEN 'objection' ELSE call_outcome END,
    call_transcript,
    COALESCE(NULLIF(call_ai_sentiment, ''), 'Neutral')
  )
  RETURNING id INTO call_id;

  IF order_product_id IS NOT NULL THEN
    INSERT INTO public.orders (
      workspace_id,
      lead_id,
      product_id,
      agent_id,
      total_amount,
      status
    )
    VALUES (
      queue_item.workspace_id,
      queue_item.lead_id,
      order_product_id,
      current_user_id,
      order_total_amount,
      'completed'
    )
    RETURNING id INTO order_id;
  END IF;

  next_lead_status := CASE
    WHEN order_product_id IS NOT NULL THEN 'customer'
    WHEN call_outcome = 'objection' THEN 'unresponsive'
    ELSE 'contacted'
  END;

  UPDATE public.leads
  SET status = next_lead_status,
      updated_at = NOW()
  WHERE id = queue_item.lead_id
    AND workspace_id = queue_item.workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead status could not be updated';
  END IF;

  IF call_outcome = 'followup_scheduled' THEN
    next_callback_at := COALESCE(callback_scheduled_at, NOW() + INTERVAL '1 hour');
    IF next_callback_at <= NOW() THEN
      RAISE EXCEPTION 'Callback must be scheduled in the future';
    END IF;
    next_queue_state := 'waiting_callback';
  ELSIF call_outcome = 'no_answer' THEN
    next_callback_at := NOW() + INTERVAL '15 minutes';
    next_queue_state := 'available';
  ELSE
    next_callback_at := NULL;
    next_queue_state := 'closed';
  END IF;

  UPDATE public.lead_queue_items
  SET state = next_queue_state,
      assigned_operator_id = NULL,
      preferred_operator_id = CASE WHEN next_queue_state IN ('available', 'waiting_callback') THEN current_user_id ELSE NULL END,
      available_at = COALESCE(next_callback_at, NOW()),
      scheduled_at = CASE WHEN next_queue_state = 'waiting_callback' THEN next_callback_at ELSE NULL END,
      lease_expires_at = NULL,
      last_heartbeat_at = NULL,
      last_outcome = call_outcome,
      released_at = CASE WHEN next_queue_state IN ('available', 'waiting_callback') THEN NOW() ELSE NULL END,
      completed_at = CASE WHEN next_queue_state = 'closed' THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    CASE WHEN next_queue_state = 'waiting_callback' THEN 'callback_scheduled' WHEN next_queue_state = 'available' THEN 'requeued' ELSE 'completed' END,
    'in_progress',
    next_queue_state,
    current_user_id,
    NULL,
    current_user_id,
    call_outcome,
    jsonb_build_object('call_id', call_id, 'order_id', order_id, 'scheduled_at', next_callback_at)
  );

  UPDATE public.operator_presence
  SET state = 'available', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;

  SELECT (private.claim_next_lead_impl(queue_item.workspace_id)::jsonb ->> 'queue_item_id')::UUID
  INTO next_item_id;

  RETURN jsonb_build_object(
    'call_id', call_id,
    'order_id', order_id,
    'lead_status', next_lead_status,
    'queue_state', next_queue_state,
    'next_lead', CASE WHEN next_item_id IS NULL THEN NULL ELSE private.queue_snapshot(next_item_id) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.release_lead_assignment_impl(
  target_queue_item_id UUID,
  release_reason TEXT
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
  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
  FOR UPDATE;

  IF queue_item.id IS NULL OR NOT private.is_workspace_manager_or_admin(queue_item.workspace_id) THEN
    RAISE EXCEPTION 'Queue item is not available for release';
  END IF;

  IF queue_item.state = 'in_progress' THEN
    RAISE EXCEPTION 'Active calls must be completed before release';
  END IF;

  UPDATE public.lead_queue_items
  SET state = 'available',
      assigned_operator_id = NULL,
      preferred_operator_id = NULL,
      available_at = NOW(),
      scheduled_at = NULL,
      lease_expires_at = NULL,
      last_heartbeat_at = NULL,
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    'released',
    queue_item.state,
    'available',
    queue_item.assigned_operator_id,
    NULL,
    current_user_id,
    NULLIF(TRIM(release_reason), ''),
    '{}'::jsonb
  );

  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.reassign_lead_assignment_impl(
  target_queue_item_id UUID,
  target_operator_id UUID,
  reassignment_reason TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
  target_workspace_id UUID;
BEGIN
  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
  FOR UPDATE;

  IF queue_item.id IS NULL OR NOT private.is_workspace_manager_or_admin(queue_item.workspace_id) THEN
    RAISE EXCEPTION 'Queue item is not available for reassignment';
  END IF;

  target_workspace_id := queue_item.workspace_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = target_operator_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Target user is not an Operator in this workspace';
  END IF;

  IF queue_item.state = 'in_progress' THEN
    RAISE EXCEPTION 'Active calls cannot be reassigned';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lead_queue_items AS active_item
    WHERE active_item.workspace_id = target_workspace_id
      AND active_item.assigned_operator_id = target_operator_id
      AND active_item.state IN ('assigned', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Target Operator already has an active lead';
  END IF;

  UPDATE public.lead_queue_items
  SET state = 'assigned',
      assigned_operator_id = target_operator_id,
      preferred_operator_id = NULL,
      claimed_at = NOW(),
      last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      scheduled_at = NULL,
      available_at = NOW(),
      updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    'reassigned',
    queue_item.state,
    'assigned',
    queue_item.assigned_operator_id,
    target_operator_id,
    current_user_id,
    NULLIF(TRIM(reassignment_reason), ''),
    '{}'::jsonb
  );

  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.reopen_lead_assignment_impl(
  target_queue_item_id UUID,
  reopen_reason TEXT
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
  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
  FOR UPDATE;

  IF queue_item.id IS NULL OR NOT private.is_workspace_manager_or_admin(queue_item.workspace_id) THEN
    RAISE EXCEPTION 'Queue item is not available for reopen';
  END IF;

  IF queue_item.state <> 'closed' THEN
    RAISE EXCEPTION 'Only closed queue items can be reopened';
  END IF;

  UPDATE public.leads
  SET status = 'contacted', updated_at = NOW()
  WHERE id = queue_item.lead_id AND workspace_id = queue_item.workspace_id;

  UPDATE public.lead_queue_items
  SET state = 'available',
      available_at = NOW(),
      scheduled_at = NULL,
      assigned_operator_id = NULL,
      preferred_operator_id = NULL,
      completed_at = NULL,
      last_outcome = NULL,
      updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    'reopened',
    'closed',
    'available',
    NULL,
    NULL,
    current_user_id,
    NULLIF(TRIM(reopen_reason), ''),
    '{}'::jsonb
  );

  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

-- Public invoker wrappers keep auth.uid() visible to the private, narrowly
-- scoped implementations while avoiding direct table mutation by clients.
CREATE OR REPLACE FUNCTION public.get_current_lead(target_workspace_id UUID)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.get_current_lead_impl(target_workspace_id); $$;

CREATE OR REPLACE FUNCTION public.claim_next_lead(target_workspace_id UUID)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.claim_next_lead_impl(target_workspace_id); $$;

CREATE OR REPLACE FUNCTION public.set_operator_presence(target_workspace_id UUID, target_state TEXT)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.set_operator_presence_impl(target_workspace_id, target_state); $$;

CREATE OR REPLACE FUNCTION public.start_lead_call(target_queue_item_id UUID)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.start_lead_call_impl(target_queue_item_id); $$;

CREATE OR REPLACE FUNCTION public.heartbeat_lead_assignment(target_queue_item_id UUID)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.heartbeat_lead_assignment_impl(target_queue_item_id); $$;

CREATE OR REPLACE FUNCTION public.complete_lead_call(
  target_queue_item_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_product_id UUID DEFAULT NULL,
  order_total_amount NUMERIC DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$
  SELECT private.complete_lead_call_impl(
    target_queue_item_id,
    call_duration_seconds,
    call_outcome,
    call_transcript,
    call_ai_sentiment,
    order_product_id,
    order_total_amount,
    callback_scheduled_at
  );
$$;

CREATE OR REPLACE FUNCTION public.release_lead_assignment(target_queue_item_id UUID, release_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.release_lead_assignment_impl(target_queue_item_id, release_reason); $$;

CREATE OR REPLACE FUNCTION public.reassign_lead_assignment(target_queue_item_id UUID, target_operator_id UUID, reassignment_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.reassign_lead_assignment_impl(target_queue_item_id, target_operator_id, reassignment_reason); $$;

CREATE OR REPLACE FUNCTION public.reopen_lead_assignment(target_queue_item_id UUID, reopen_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path = public, private, pg_temp
AS $$ SELECT private.reopen_lead_assignment_impl(target_queue_item_id, reopen_reason); $$;

REVOKE ALL ON FUNCTION public.get_current_lead(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_next_lead(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_operator_presence(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_lead_call(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.heartbeat_lead_assignment(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_lead_call(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_lead_assignment(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reassign_lead_assignment(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_lead_assignment(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_current_lead(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_lead(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_operator_presence(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_lead_call(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_lead_assignment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lead_call(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, NUMERIC, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_lead_assignment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_lead_assignment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_lead_assignment(UUID, TEXT) TO authenticated;
