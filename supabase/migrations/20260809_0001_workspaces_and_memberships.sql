-- Countdown CRM: organization, workspace and membership foundation.
-- This migration intentionally does not add workspace_id to business tables yet.

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspaces_organization_id_idx
  ON public.workspaces(organization_id);

CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx
  ON public.workspace_members(user_id);

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id UUID)
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
      AND member.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(target_workspace_id UUID)
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
      AND member.user_id = auth.uid()
      AND member.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID) TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspaces AS workspace
      WHERE workspace.organization_id = organizations.id
        AND public.is_workspace_member(workspace.id)
    )
  );

DROP POLICY IF EXISTS "Organization admins can update their organizations" ON public.organizations;
CREATE POLICY "Organization admins can update their organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspaces AS workspace
      WHERE workspace.organization_id = organizations.id
        AND public.is_workspace_admin(workspace.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspaces AS workspace
      WHERE workspace.organization_id = organizations.id
        AND public.is_workspace_admin(workspace.id)
    )
  );

DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
CREATE POLICY "Members can view their workspaces"
  ON public.workspaces
  FOR SELECT
  USING (public.is_workspace_member(id));

DROP POLICY IF EXISTS "Workspace admins can update their workspaces" ON public.workspaces;
CREATE POLICY "Workspace admins can update their workspaces"
  ON public.workspaces
  FOR UPDATE
  USING (public.is_workspace_admin(id))
  WITH CHECK (public.is_workspace_admin(id));

DROP POLICY IF EXISTS "Members can view workspace memberships" ON public.workspace_members;
CREATE POLICY "Members can view workspace memberships"
  ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace admins can manage memberships" ON public.workspace_members;
CREATE POLICY "Workspace admins can manage memberships"
  ON public.workspace_members
  FOR ALL
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));
