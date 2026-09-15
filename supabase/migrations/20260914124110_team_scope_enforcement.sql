-- Countdown CRM: enable team scope for leads and queue operations.
-- Administrators remain workspace-wide. Team Leaders can access only active
-- teams they lead. Operators can claim only work owned by their active team.

CREATE OR REPLACE FUNCTION private.current_operator_team_id(target_workspace_id UUID)
RETURNS UUID
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_team_id UUID;
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can use queue work';
  END IF;

  SELECT membership.team_id
  INTO active_team_id
  FROM public.team_memberships AS membership
  JOIN public.teams AS team
    ON team.id = membership.team_id
   AND team.workspace_id = membership.workspace_id
  WHERE membership.workspace_id = target_workspace_id
    AND membership.user_id = current_user_id
    AND membership.membership_role = 'member'
    AND membership.active_from <= NOW()
    AND (membership.active_until IS NULL OR membership.active_until > NOW())
    AND team.status = 'active'
  ORDER BY membership.active_from DESC
  LIMIT 1;

  IF active_team_id IS NULL THEN
    RAISE EXCEPTION 'Operator is not assigned to an active team; contact an Administrator';
  END IF;

  RETURN active_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.can_manage_team_resource(
  target_workspace_id UUID,
  target_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.is_workspace_admin(target_workspace_id)
    OR (
      target_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.teams AS team
        WHERE team.id = target_team_id
          AND team.workspace_id = target_workspace_id
          AND team.status = 'active'
      )
      AND private.is_team_leader(target_team_id)
    );
$$;

CREATE OR REPLACE FUNCTION private.can_view_operator_presence(
  target_workspace_id UUID,
  target_operator_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.is_workspace_admin(target_workspace_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships AS operator_membership
      WHERE operator_membership.workspace_id = target_workspace_id
        AND operator_membership.user_id = target_operator_id
        AND operator_membership.membership_role = 'member'
        AND operator_membership.active_from <= NOW()
        AND (operator_membership.active_until IS NULL OR operator_membership.active_until > NOW())
        AND private.is_team_leader(operator_membership.team_id)
    );
$$;

REVOKE ALL ON FUNCTION private.current_operator_team_id(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.can_manage_team_resource(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.can_view_operator_presence(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_operator_team_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_manage_team_resource(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_operator_presence(UUID, UUID) TO authenticated, service_role;

-- Defense in depth for direct table writes made by trusted server functions.
-- A queue item may remain unowned during administrator setup, but once it has
-- a team its assigned and preferred operators must belong to that same team.
CREATE OR REPLACE FUNCTION private.validate_queue_item_team_assignment()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NEW.assigned_operator_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.team_memberships AS membership
       JOIN public.workspace_members AS member
         ON member.workspace_id = membership.workspace_id
        AND member.user_id = membership.user_id
       WHERE membership.team_id = NEW.team_id
         AND membership.workspace_id = NEW.workspace_id
         AND membership.user_id = NEW.assigned_operator_id
         AND membership.membership_role = 'member'
         AND membership.active_from <= NOW()
         AND (membership.active_until IS NULL OR membership.active_until > NOW())
         AND member.role = 'operator'
     ) THEN
    RAISE EXCEPTION 'Assigned Operator must belong to the queue item team';
  END IF;

  IF NEW.team_id IS NOT NULL AND NEW.preferred_operator_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.team_memberships AS membership
       JOIN public.workspace_members AS member
         ON member.workspace_id = membership.workspace_id
        AND member.user_id = membership.user_id
       WHERE membership.team_id = NEW.team_id
         AND membership.workspace_id = NEW.workspace_id
         AND membership.user_id = NEW.preferred_operator_id
         AND membership.membership_role = 'member'
         AND membership.active_from <= NOW()
         AND (membership.active_until IS NULL OR membership.active_until > NOW())
         AND member.role = 'operator'
     ) THEN
    RAISE EXCEPTION 'Preferred Operator must belong to the queue item team';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_queue_item_team_assignment ON public.lead_queue_items;
CREATE TRIGGER validate_queue_item_team_assignment
  BEFORE INSERT OR UPDATE OF team_id, assigned_operator_id, preferred_operator_id
  ON public.lead_queue_items
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_queue_item_team_assignment();

-- Every future queue event keeps the team snapshot that was on the queue item
-- at the moment the event was recorded.
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
    workspace_id, team_id, queue_item_id, lead_id, event_type,
    from_state, to_state, from_operator_id, to_operator_id,
    actor_id, reason, metadata
  )
  SELECT
    queue_item.workspace_id, queue_item.team_id, queue_item.id, queue_item.lead_id,
    target_event_type, target_from_state, target_to_state,
    target_from_operator_id, target_to_operator_id, target_actor_id,
    target_reason, COALESCE(target_metadata, '{}'::jsonb)
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.id = target_queue_item_id;
$$;

CREATE OR REPLACE FUNCTION private.claim_next_lead_impl(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
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
    AND queue_item.state IN ('available', 'waiting_callback')
    AND queue_item.available_at <= NOW()
    AND (queue_item.scheduled_at IS NULL OR queue_item.scheduled_at <= NOW())
    AND (
      queue_item.preferred_operator_id IS NULL
      OR queue_item.preferred_operator_id = current_user_id
      OR EXISTS (
        SELECT 1 FROM public.team_memberships AS preferred_membership
        WHERE preferred_membership.workspace_id = target_workspace_id
          AND preferred_membership.team_id = operator_team_id
          AND preferred_membership.user_id = queue_item.preferred_operator_id
          AND preferred_membership.membership_role = 'member'
          AND preferred_membership.active_from <= NOW()
          AND (preferred_membership.active_until IS NULL OR preferred_membership.active_until > NOW())
      )
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
$$;

CREATE OR REPLACE FUNCTION private.get_current_lead_impl(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  operator_team_id UUID;
  current_item RECORD;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  operator_team_id := private.current_operator_team_id(target_workspace_id);

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
  IF current_item.team_id IS NULL THEN
    RAISE EXCEPTION 'Current queue assignment has no team ownership; contact an Administrator';
  END IF;
  IF current_item.team_id <> operator_team_id THEN
    RAISE EXCEPTION 'Current queue assignment belongs to another team';
  END IF;

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
  operator_team_id UUID;
  queue_item RECORD;
BEGIN
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id AND state = 'assigned'
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead assignment is not available for call'; END IF;

  operator_team_id := private.current_operator_team_id(queue_item.workspace_id);
  IF queue_item.team_id IS NULL OR queue_item.team_id <> operator_team_id THEN
    RAISE EXCEPTION 'Lead assignment belongs to another team';
  END IF;
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
  operator_team_id UUID;
  queue_item RECORD;
  next_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id
    AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
  FOR UPDATE;
  IF queue_item.id IS NULL THEN RAISE EXCEPTION 'Lead assignment is not active'; END IF;

  operator_team_id := private.current_operator_team_id(queue_item.workspace_id);
  IF queue_item.team_id IS NULL OR queue_item.team_id <> operator_team_id THEN
    RAISE EXCEPTION 'Lead assignment belongs to another team';
  END IF;

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
  SELECT * INTO queue_item FROM public.lead_queue_items WHERE id = target_queue_item_id FOR UPDATE;
  IF queue_item.id IS NULL OR NOT private.can_manage_team_resource(queue_item.workspace_id, queue_item.team_id) THEN
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
BEGIN
  SELECT * INTO queue_item FROM public.lead_queue_items WHERE id = target_queue_item_id FOR UPDATE;
  IF queue_item.id IS NULL OR NOT private.can_manage_team_resource(queue_item.workspace_id, queue_item.team_id) THEN
    RAISE EXCEPTION 'Queue item is not available for reassignment';
  END IF;
  IF queue_item.team_id IS NULL THEN RAISE EXCEPTION 'Queue item has no team ownership; contact an Administrator'; END IF;
  IF queue_item.state IN ('in_progress', 'awaiting_outcome') THEN
    RAISE EXCEPTION 'Active or recovery calls cannot be reassigned';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    JOIN public.team_memberships AS membership
      ON membership.workspace_id = member.workspace_id
     AND membership.user_id = member.user_id
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = target_operator_id
      AND member.role = 'operator'
      AND membership.team_id = queue_item.team_id
      AND membership.membership_role = 'member'
      AND membership.active_from <= NOW()
      AND (membership.active_until IS NULL OR membership.active_until > NOW())
  ) THEN RAISE EXCEPTION 'Target Operator must belong to the same team as the queue item'; END IF;
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
  SELECT * INTO queue_item FROM public.lead_queue_items WHERE id = target_queue_item_id FOR UPDATE;
  IF queue_item.id IS NULL OR NOT private.can_manage_team_resource(queue_item.workspace_id, queue_item.team_id) THEN
    RAISE EXCEPTION 'Queue item is not available for reopen';
  END IF;
  IF queue_item.state <> 'closed' THEN RAISE EXCEPTION 'Only closed queue items can be reopened'; END IF;

  UPDATE public.leads SET status = 'contacted', updated_at = NOW()
  WHERE id = queue_item.lead_id AND workspace_id = queue_item.workspace_id;
  UPDATE public.lead_queue_items
  SET state = 'available', available_at = NOW(), scheduled_at = NULL,
      assigned_operator_id = NULL, preferred_operator_id = NULL,
      completed_at = NULL, last_outcome = NULL, updated_at = NOW()
  WHERE id = target_queue_item_id;
  PERFORM private.record_queue_event(
    target_queue_item_id, 'reopened', 'closed', 'available', NULL, NULL, current_user_id,
    NULLIF(TRIM(reopen_reason), ''), '{}'
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

-- Replace the old workspace-wide manager policies. NULL team ownership is
-- intentionally invisible to Team Leaders and remains an Administrator issue.
DROP POLICY IF EXISTS "Workspace members can view leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace members can create leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace members can update leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can view leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can create leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can update leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view leads" ON public.leads;
DROP POLICY IF EXISTS "Team Leaders and Administrators can create leads" ON public.leads;
DROP POLICY IF EXISTS "Team Leaders and Administrators can update leads" ON public.leads;
DROP POLICY IF EXISTS "Team Leaders and Administrators can delete leads" ON public.leads;

CREATE POLICY "Team Leaders and Administrators can view leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (team_id IS NOT NULL AND private.is_team_leader(team_id))
  );
CREATE POLICY "Team Leaders and Administrators can create leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_admin(workspace_id)
    OR (team_id IS NOT NULL AND private.is_team_leader(team_id))
  );
CREATE POLICY "Team Leaders and Administrators can update leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (team_id IS NOT NULL AND private.is_team_leader(team_id))
  )
  WITH CHECK (
    private.is_workspace_admin(workspace_id)
    OR (team_id IS NOT NULL AND private.is_team_leader(team_id))
  );
CREATE POLICY "Team Leaders and Administrators can delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (team_id IS NOT NULL AND private.is_team_leader(team_id))
  );

DROP POLICY IF EXISTS "Workspace managers can view operator presence" ON public.operator_presence;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view operator presence" ON public.operator_presence;
CREATE POLICY "Team Leaders and Administrators can view operator presence"
  ON public.operator_presence FOR SELECT TO authenticated
  USING (private.can_view_operator_presence(workspace_id, operator_id));

DROP POLICY IF EXISTS "Workspace managers can view queue items" ON public.lead_queue_items;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view queue items" ON public.lead_queue_items;
DROP POLICY IF EXISTS "Operators can view current queue item" ON public.lead_queue_items;
CREATE POLICY "Team Leaders and Administrators can view queue items"
  ON public.lead_queue_items FOR SELECT TO authenticated
  USING (private.can_manage_team_resource(workspace_id, team_id));
CREATE POLICY "Operators can view current queue item"
  ON public.lead_queue_items FOR SELECT TO authenticated
  USING (
    assigned_operator_id = (SELECT auth.uid())
    AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
    AND team_id IS NOT NULL
    AND private.is_team_member(team_id)
    AND private.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Workspace managers can view queue events" ON public.lead_queue_events;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view queue events" ON public.lead_queue_events;
CREATE POLICY "Team Leaders and Administrators can view queue events"
  ON public.lead_queue_events FOR SELECT TO authenticated
  USING (private.can_manage_team_resource(workspace_id, team_id));

COMMENT ON FUNCTION private.current_operator_team_id(UUID) IS
  'Returns the authenticated operator active team or raises an actionable setup error.';
COMMENT ON POLICY "Team Leaders and Administrators can view leads" ON public.leads IS
  'Administrators see all workspace leads; Team Leaders see only leads in teams they lead. NULL team ownership is Administrator-only setup work.';
COMMENT ON POLICY "Team Leaders and Administrators can view queue items" ON public.lead_queue_items IS
  'Administrators see all queue items; Team Leaders see only queue items in teams they lead.';
