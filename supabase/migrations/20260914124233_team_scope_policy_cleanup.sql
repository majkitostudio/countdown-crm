-- Remove the older combined workspace-wide queue policies left by the
-- historical queue hardening migration. The team-scoped policies are now the
-- only manager path; operators retain access only to their own presence and
-- current assignment.

DROP POLICY IF EXISTS "Workspace members can view permitted queue items"
  ON public.lead_queue_items;

DROP POLICY IF EXISTS "Workspace members can view permitted operator presence"
  ON public.operator_presence;

DROP POLICY IF EXISTS "Operators can view own presence"
  ON public.operator_presence;
CREATE POLICY "Operators can view own presence"
  ON public.operator_presence
  FOR SELECT TO authenticated
  USING (
    operator_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );
