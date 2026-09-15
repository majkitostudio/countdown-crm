-- Consolidate the team-manager and self-operator SELECT paths so Supabase
-- does not evaluate multiple permissive policies for the same read.

DROP POLICY IF EXISTS "Operators can view current queue item"
  ON public.lead_queue_items;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view queue items"
  ON public.lead_queue_items;
DROP POLICY IF EXISTS "Workspace members can view permitted queue items"
  ON public.lead_queue_items;
CREATE POLICY "Workspace members can view permitted queue items"
  ON public.lead_queue_items
  FOR SELECT TO authenticated
  USING (
    private.can_manage_team_resource(workspace_id, team_id)
    OR (
      assigned_operator_id = (SELECT auth.uid())
      AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
      AND team_id IS NOT NULL
      AND private.is_team_member(team_id)
      AND private.is_workspace_member(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Operators can view own presence"
  ON public.operator_presence;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view operator presence"
  ON public.operator_presence;
DROP POLICY IF EXISTS "Workspace members can view permitted operator presence"
  ON public.operator_presence;
CREATE POLICY "Workspace members can view permitted operator presence"
  ON public.operator_presence
  FOR SELECT TO authenticated
  USING (
    private.can_view_operator_presence(workspace_id, operator_id)
    OR (
      operator_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  );
