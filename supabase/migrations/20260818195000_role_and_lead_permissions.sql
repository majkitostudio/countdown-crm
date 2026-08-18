-- Countdown CRM: make human workspace roles explicit and reserve "agent"
-- for AI terminology. Lead management belongs to Team Leaders and
-- Administrators; Operators do not receive a lead directory or lead CRUD.

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

UPDATE public.workspace_members
SET role = CASE role
  WHEN 'admin' THEN 'administrator'
  WHEN 'manager' THEN 'team_leader'
  WHEN 'agent' THEN 'operator'
  ELSE role
END;

ALTER TABLE public.workspace_members
  ALTER COLUMN role SET DEFAULT 'operator';

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('administrator', 'team_leader', 'operator'));

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'operator';

UPDATE public.profiles
SET role = CASE role
  WHEN 'admin' THEN 'administrator'
  WHEN 'manager' THEN 'team_leader'
  WHEN 'agent' THEN 'operator'
  ELSE role
END;

CREATE OR REPLACE FUNCTION private.is_workspace_admin(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = (SELECT auth.uid())
      AND member.role = 'administrator'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_workspace_manager_or_admin(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = (SELECT auth.uid())
      AND member.role IN ('team_leader', 'administrator')
  );
$$;

DROP POLICY IF EXISTS "Workspace members can view leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace members can create leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace members can update leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can view leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can create leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can update leads" ON public.leads;
DROP POLICY IF EXISTS "Workspace managers can delete leads" ON public.leads;

CREATE POLICY "Workspace managers can view leads"
  ON public.leads
  FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can create leads"
  ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NOT NULL AND private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can update leads"
  ON public.leads
  FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can delete leads"
  ON public.leads
  FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));
