-- Countdown CRM: remove overlapping workspace membership SELECT policies.
-- All members can read workspace membership metadata; only Administrators
-- can mutate it.

DROP POLICY IF EXISTS "Members can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace administrators can insert memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace administrators can update memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace administrators can delete memberships" ON public.workspace_members;

CREATE POLICY "Members can view workspace memberships"
  ON public.workspace_members
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

CREATE POLICY "Workspace administrators can insert memberships"
  ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace administrators can update memberships"
  ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (private.is_workspace_admin(workspace_id))
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace administrators can delete memberships"
  ON public.workspace_members
  FOR DELETE TO authenticated
  USING (private.is_workspace_admin(workspace_id));
