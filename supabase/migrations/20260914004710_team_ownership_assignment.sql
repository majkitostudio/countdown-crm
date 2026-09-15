-- Countdown CRM: administrator-only ownership assignment for the team rollout.
-- This changes only the responsible team marker. It does not alter queue state
-- or operator assignment, and it records every change in the audit trail.

ALTER TABLE public.lead_queue_events
  DROP CONSTRAINT IF EXISTS lead_queue_events_event_type_check;
ALTER TABLE public.lead_queue_events
  ADD CONSTRAINT lead_queue_events_event_type_check CHECK (event_type IN (
    'created', 'claimed', 'started', 'heartbeat', 'completed', 'released',
    'reassigned', 'callback_scheduled', 'requeued', 'lease_expired',
    'interrupted', 'outcome_pending', 'reopened', 'paused', 'team_assigned'
  ));

CREATE OR REPLACE FUNCTION private.assign_team_ownership_impl(
  target_resource_type TEXT,
  target_resource_id UUID,
  target_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  resource_workspace_id UUID;
  resource_lead_id UUID;
  previous_team_id UUID;
  queue_state TEXT;
  queue_assigned_operator_id UUID;
  target_team_workspace_id UUID;
  target_team_status TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF target_resource_type NOT IN ('lead', 'queue_item') OR target_resource_id IS NULL THEN
    RAISE EXCEPTION 'A valid ownership target is required';
  END IF;

  IF target_resource_type = 'lead' THEN
    SELECT lead.workspace_id, lead.team_id
    INTO resource_workspace_id, previous_team_id
    FROM public.leads AS lead
    WHERE lead.id = target_resource_id
    FOR UPDATE;
  ELSE
    SELECT queue_item.workspace_id, queue_item.lead_id, queue_item.team_id,
           queue_item.state, queue_item.assigned_operator_id
    INTO resource_workspace_id, resource_lead_id, previous_team_id,
         queue_state, queue_assigned_operator_id
    FROM public.lead_queue_items AS queue_item
    WHERE queue_item.id = target_resource_id
    FOR UPDATE;
  END IF;

  IF resource_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Ownership target was not found';
  END IF;

  IF NOT private.is_workspace_admin(resource_workspace_id) THEN
    RAISE EXCEPTION 'Only workspace administrators can assign team ownership';
  END IF;

  IF target_team_id IS NOT NULL THEN
    SELECT team.workspace_id, team.status
    INTO target_team_workspace_id, target_team_status
    FROM public.teams AS team
    WHERE team.id = target_team_id;

    IF target_team_workspace_id IS NULL OR target_team_workspace_id <> resource_workspace_id THEN
      RAISE EXCEPTION 'Team must belong to the same workspace';
    END IF;

    IF target_team_status <> 'active' THEN
      RAISE EXCEPTION 'Only active teams can receive ownership';
    END IF;
  END IF;

  IF previous_team_id IS NOT DISTINCT FROM target_team_id THEN
    RETURN jsonb_build_object(
      'resource_type', target_resource_type,
      'resource_id', target_resource_id,
      'workspace_id', resource_workspace_id,
      'team_id', target_team_id,
      'changed', FALSE
    );
  END IF;

  IF target_resource_type = 'lead' THEN
    UPDATE public.leads
    SET team_id = target_team_id, updated_at = NOW()
    WHERE id = target_resource_id
      AND workspace_id = resource_workspace_id;
  ELSE
    UPDATE public.lead_queue_items
    SET team_id = target_team_id, updated_at = NOW()
    WHERE id = target_resource_id
      AND workspace_id = resource_workspace_id;

    INSERT INTO public.lead_queue_events (
      workspace_id, team_id, queue_item_id, lead_id, event_type,
      from_state, to_state, from_operator_id, to_operator_id,
      actor_id, reason, metadata
    ) VALUES (
      resource_workspace_id, target_team_id, target_resource_id, resource_lead_id,
      'team_assigned', queue_state, queue_state,
      queue_assigned_operator_id, queue_assigned_operator_id,
      current_user_id, 'Team ownership changed',
      jsonb_build_object('previous_team_id', previous_team_id, 'team_id', target_team_id)
    );
  END IF;

  INSERT INTO public.audit_logs (
    workspace_id, actor_id, actor_name, action, target_resource, details, severity
  )
  SELECT
    resource_workspace_id,
    current_user_id,
    COALESCE(NULLIF(btrim(profile.full_name), ''), 'System'),
    'SETTINGS_CHANGE',
    target_resource_type || ':' || target_resource_id::TEXT,
    jsonb_build_object(
      'change', 'team_ownership',
      'resource_type', target_resource_type,
      'resource_id', target_resource_id,
      'previous_team_id', previous_team_id,
      'team_id', target_team_id
    )::TEXT,
    'low'
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  RETURN jsonb_build_object(
    'resource_type', target_resource_type,
    'resource_id', target_resource_id,
    'workspace_id', resource_workspace_id,
    'team_id', target_team_id,
    'changed', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_team_ownership(
  target_resource_type TEXT,
  target_resource_id UUID,
  target_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.assign_team_ownership_impl(
    target_resource_type,
    target_resource_id,
    target_team_id
  );
$$;

REVOKE ALL ON FUNCTION public.assign_team_ownership(TEXT, UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_team_ownership(TEXT, UUID, UUID)
  TO authenticated;
