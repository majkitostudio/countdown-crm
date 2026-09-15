-- Administrators retain workspace-wide visibility for provider sessions that
-- are not linked to a completed call or a team-owned queue item yet.

CREATE OR REPLACE FUNCTION private.can_access_telephony_session(
  target_workspace_id UUID,
  target_session_id UUID
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
      FROM public.telephony_call_sessions AS session
      LEFT JOIN public.calls AS completed_call
        ON completed_call.id = session.completed_call_id
       AND completed_call.workspace_id = session.workspace_id
      LEFT JOIN public.lead_queue_items AS queue_item
        ON queue_item.id = session.queue_item_id
       AND queue_item.workspace_id = session.workspace_id
      WHERE session.id = target_session_id
        AND session.workspace_id = target_workspace_id
        AND (
          private.can_manage_team_resource(completed_call.workspace_id, completed_call.team_id)
          OR private.can_manage_team_resource(queue_item.workspace_id, queue_item.team_id)
        )
    );
$$;
