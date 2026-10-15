-- Countdown CRM: confirming the responsible team must also route the work that
-- belongs to it. Until now an administrator confirmed the lead and then every
-- queue item separately, so a lead could look routed while its own queue item
-- stayed without a team -- and teamless queue items are invisible to Team
-- Leaders and Operators, they only wait for an Administrator.
--
-- This migration only fills ownership that has not been confirmed yet:
--   * confirming a lead routes the lead's own queue items,
--   * confirming a queue item routes its own lead.
-- Queue state, operator assignment and already confirmed ownership stay
-- untouched, so the guarantees of 20260914004710_team_ownership_assignment.sql
-- still hold. Ownership that stays unconfirmed is reported back to the caller.

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
  cascaded_leads INTEGER := 0;
  cascaded_queue_items INTEGER := 0;
  remaining_queue_items INTEGER := 0;
  cascaded_item RECORD;
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
      'changed', FALSE,
      'leads_updated', 0,
      'queue_items_updated', 0,
      'queue_items_remaining', 0
    );
  END IF;

  IF target_resource_type = 'lead' THEN
    UPDATE public.leads
    SET team_id = target_team_id, updated_at = NOW()
    WHERE id = target_resource_id
      AND workspace_id = resource_workspace_id;

    IF target_team_id IS NOT NULL THEN
      -- Fill only the lead's own queue items that have no team yet, and only
      -- when their operators already belong to the target team. An item held by
      -- an operator from another team must be left to the Administrator, because
      -- the team assignment trigger would reject the update outright.
      FOR cascaded_item IN
        SELECT queue_item.id, queue_item.state, queue_item.assigned_operator_id
        FROM public.lead_queue_items AS queue_item
        WHERE queue_item.lead_id = target_resource_id
          AND queue_item.workspace_id = resource_workspace_id
          AND queue_item.team_id IS NULL
          AND (
            queue_item.assigned_operator_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.team_memberships AS membership
              JOIN public.workspace_members AS member
                ON member.workspace_id = membership.workspace_id
               AND member.user_id = membership.user_id
              WHERE membership.team_id = target_team_id
                AND membership.workspace_id = resource_workspace_id
                AND membership.user_id = queue_item.assigned_operator_id
                AND membership.membership_role = 'member'
                AND membership.active_from <= NOW()
                AND (membership.active_until IS NULL OR membership.active_until > NOW())
                AND member.role = 'operator'
            )
          )
          AND (
            queue_item.preferred_operator_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.team_memberships AS membership
              JOIN public.workspace_members AS member
                ON member.workspace_id = membership.workspace_id
               AND member.user_id = membership.user_id
              WHERE membership.team_id = target_team_id
                AND membership.workspace_id = resource_workspace_id
                AND membership.user_id = queue_item.preferred_operator_id
                AND membership.membership_role = 'member'
                AND membership.active_from <= NOW()
                AND (membership.active_until IS NULL OR membership.active_until > NOW())
                AND member.role = 'operator'
            )
          )
        ORDER BY queue_item.created_at, queue_item.id
        FOR UPDATE
      LOOP
        UPDATE public.lead_queue_items
        SET team_id = target_team_id, updated_at = NOW()
        WHERE id = cascaded_item.id;

        INSERT INTO public.lead_queue_events (
          workspace_id, team_id, queue_item_id, lead_id, event_type,
          from_state, to_state, from_operator_id, to_operator_id,
          actor_id, reason, metadata
        ) VALUES (
          resource_workspace_id, target_team_id, cascaded_item.id, target_resource_id,
          'team_assigned', cascaded_item.state, cascaded_item.state,
          cascaded_item.assigned_operator_id, cascaded_item.assigned_operator_id,
          current_user_id,
          'Team ownership confirmed through the responsible lead',
          jsonb_build_object(
            'change', 'team_ownership',
            'resource_type', 'lead',
            'lead_id', target_resource_id
          )
        );

        cascaded_queue_items := cascaded_queue_items + 1;
      END LOOP;

      SELECT count(*) INTO remaining_queue_items
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.lead_id = target_resource_id
        AND queue_item.workspace_id = resource_workspace_id
        AND queue_item.team_id IS NULL;
    END IF;
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

    -- A confirmed queue item without its lead would leave the lead invisible to
    -- the team that now owns its work, so fill the lead's ownership as well.
    IF target_team_id IS NOT NULL AND resource_lead_id IS NOT NULL THEN
      UPDATE public.leads
      SET team_id = target_team_id, updated_at = NOW()
      WHERE id = resource_lead_id
        AND workspace_id = resource_workspace_id
        AND team_id IS NULL;
      GET DIAGNOSTICS cascaded_leads = ROW_COUNT;
    END IF;
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
      'team_id', target_team_id,
      'leads_updated', cascaded_leads,
      'queue_items_updated', cascaded_queue_items,
      'queue_items_remaining', remaining_queue_items
    )::TEXT,
    'low'
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  RETURN jsonb_build_object(
    'resource_type', target_resource_type,
    'resource_id', target_resource_id,
    'workspace_id', resource_workspace_id,
    'team_id', target_team_id,
    'changed', TRUE,
    'leads_updated', cascaded_leads,
    'queue_items_updated', cascaded_queue_items,
    'queue_items_remaining', remaining_queue_items
  );
END;
$$;
