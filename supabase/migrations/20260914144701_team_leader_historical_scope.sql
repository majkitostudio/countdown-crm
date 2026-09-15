-- Countdown CRM: scope historical manager-facing records to led teams.
-- Administrators remain workspace-wide. Operators retain their own records.

DROP POLICY IF EXISTS "Workspace members can view calls" ON public.calls;
DROP POLICY IF EXISTS "Workspace roles can view permitted calls" ON public.calls;
CREATE POLICY "Workspace roles can view permitted calls"
  ON public.calls
  FOR SELECT
  TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (
      private.is_workspace_member(workspace_id)
      AND agent_id = (SELECT auth.uid())
    )
    OR private.can_manage_team_resource(workspace_id, team_id)
  );

DROP POLICY IF EXISTS "Workspace roles can view permitted orders" ON public.orders;
CREATE POLICY "Workspace roles can view permitted orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (
      private.is_workspace_member(workspace_id)
      AND agent_id = (SELECT auth.uid())
    )
    OR private.can_manage_team_resource(workspace_id, team_id)
  );

-- Order details, status history and status changes use the same team boundary.
CREATE OR REPLACE FUNCTION private.can_access_order(
  target_workspace_id UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS order_row
    WHERE order_row.id = target_order_id
      AND order_row.workspace_id = target_workspace_id
      AND (
        order_row.agent_id = (SELECT auth.uid())
        OR private.can_manage_team_resource(order_row.workspace_id, order_row.team_id)
      )
  );
$$;

-- Review rows must follow the team of the reviewed call.
CREATE OR REPLACE FUNCTION private.can_access_call_review(
  target_workspace_id UUID,
  target_call_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calls AS reviewed_call
    WHERE reviewed_call.id = target_call_id
      AND reviewed_call.workspace_id = target_workspace_id
      AND private.can_manage_team_resource(reviewed_call.workspace_id, reviewed_call.team_id)
  );
$$;

REVOKE ALL ON FUNCTION private.can_access_call_review(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_call_review(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Workspace managers can view call review revisions" ON public.call_review_revisions;
CREATE POLICY "Workspace managers can view call review revisions"
  ON public.call_review_revisions
  FOR SELECT
  TO authenticated
  USING (private.can_access_call_review(workspace_id, call_id));

DROP POLICY IF EXISTS "Workspace managers can create call review revisions" ON public.call_review_revisions;
CREATE POLICY "Workspace managers can create call review revisions"
  ON public.call_review_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.can_access_call_review(workspace_id, call_id)
    AND reviewer_id = (SELECT auth.uid())
  );

-- Call review reads the provider session for evidence. Scope it through the
-- completed call first, with queue ownership as a fallback for unfinished data.
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
  SELECT EXISTS (
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

REVOKE ALL ON FUNCTION private.can_access_telephony_session(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_telephony_session(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Workspace members can view telephony sessions" ON public.telephony_call_sessions;
CREATE POLICY "Workspace members can view telephony sessions"
  ON public.telephony_call_sessions
  FOR SELECT
  TO authenticated
  USING (private.can_access_telephony_session(workspace_id, id));
