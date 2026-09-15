-- Countdown CRM: first foundation for real workspace teams.
-- This migration adds team records and memberships without changing the
-- existing workspace-wide queue behavior yet. Team scope is enabled later,
-- after administrators have assigned current users and operational data.

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teams_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT teams_slug_not_blank CHECK (length(btrim(slug)) > 0),
  CONSTRAINT teams_workspace_id_id_key UNIQUE (workspace_id, id),
  CONSTRAINT teams_workspace_slug_key UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member'
    CHECK (membership_role IN ('member', 'leader')),
  active_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_memberships_team_workspace_fkey
    FOREIGN KEY (team_id, workspace_id)
    REFERENCES public.teams(id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT team_memberships_workspace_user_fkey
    FOREIGN KEY (workspace_id, user_id)
    REFERENCES public.workspace_members(workspace_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT team_memberships_active_window_check
    CHECK (active_until IS NULL OR active_until > active_from),
  CONSTRAINT team_memberships_team_user_start_key
    UNIQUE (team_id, user_id, active_from)
);

CREATE INDEX IF NOT EXISTS teams_workspace_status_idx
  ON public.teams(workspace_id, status, name);

CREATE INDEX IF NOT EXISTS team_memberships_workspace_user_idx
  ON public.team_memberships(workspace_id, user_id, active_until);

CREATE INDEX IF NOT EXISTS team_memberships_team_active_idx
  ON public.team_memberships(team_id, active_until, membership_role);

-- An operator can have only one active team. Team Leaders may lead more than
-- one team, which keeps the model useful for future supervisory structures.
CREATE UNIQUE INDEX IF NOT EXISTS team_memberships_one_active_operator_team_idx
  ON public.team_memberships(workspace_id, user_id)
  WHERE membership_role = 'member' AND active_until IS NULL;

CREATE OR REPLACE FUNCTION private.is_team_member(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships AS membership
    WHERE membership.team_id = target_team_id
      AND membership.user_id = (SELECT auth.uid())
      AND membership.active_from <= NOW()
      AND (membership.active_until IS NULL OR membership.active_until > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_team_leader(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships AS membership
    WHERE membership.team_id = target_team_id
      AND membership.user_id = (SELECT auth.uid())
      AND membership.membership_role = 'leader'
      AND membership.active_from <= NOW()
      AND (membership.active_until IS NULL OR membership.active_until > NOW())
  );
$$;

REVOKE ALL ON FUNCTION private.is_team_member(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.is_team_leader(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_team_member(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_team_leader(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.validate_team_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  workspace_role TEXT;
  team_status TEXT;
BEGIN
  SELECT member.role
  INTO workspace_role
  FROM public.workspace_members AS member
  WHERE member.workspace_id = NEW.workspace_id
    AND member.user_id = NEW.user_id;

  IF workspace_role IS NULL THEN
    RAISE EXCEPTION 'Team membership requires a member of the same workspace';
  END IF;

  IF NEW.membership_role = 'member' AND workspace_role <> 'operator' THEN
    RAISE EXCEPTION 'Only operators can receive a team member membership';
  END IF;

  IF NEW.membership_role = 'leader' AND workspace_role <> 'team_leader' THEN
    RAISE EXCEPTION 'Only Team Leaders can receive a team leader membership';
  END IF;

  SELECT team.status
  INTO team_status
  FROM public.teams AS team
  WHERE team.id = NEW.team_id
    AND team.workspace_id = NEW.workspace_id;

  IF team_status IS NULL THEN
    RAISE EXCEPTION 'Team membership requires a team in the same workspace';
  END IF;

  IF NEW.active_until IS NULL AND team_status <> 'active' THEN
    RAISE EXCEPTION 'Archived teams cannot receive active memberships';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_team_membership ON public.team_memberships;
CREATE TRIGGER validate_team_membership
  BEFORE INSERT OR UPDATE ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_team_membership();

CREATE OR REPLACE FUNCTION private.prevent_incompatible_workspace_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role <> 'operator' AND EXISTS (
    SELECT 1
    FROM public.team_memberships AS membership
    WHERE membership.workspace_id = NEW.workspace_id
      AND membership.user_id = NEW.user_id
      AND membership.membership_role = 'member'
      AND membership.active_until IS NULL
  ) THEN
    RAISE EXCEPTION 'End the active operator team membership before changing the workspace role';
  END IF;

  IF NEW.role <> 'team_leader' AND EXISTS (
    SELECT 1
    FROM public.team_memberships AS membership
    WHERE membership.workspace_id = NEW.workspace_id
      AND membership.user_id = NEW.user_id
      AND membership.membership_role = 'leader'
      AND membership.active_until IS NULL
  ) THEN
    RAISE EXCEPTION 'End active Team Leader memberships before changing the workspace role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_incompatible_workspace_role_change ON public.workspace_members;
CREATE TRIGGER prevent_incompatible_workspace_role_change
  BEFORE UPDATE OF role ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_incompatible_workspace_role_change();

CREATE OR REPLACE FUNCTION private.audit_team_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed_workspace_id UUID;
  changed_resource_id UUID;
  action_name TEXT;
  details_json JSONB;
  actor_id_text TEXT;
  actor_name_text TEXT;
BEGIN
  changed_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  changed_resource_id := COALESCE(NEW.id, OLD.id);
  action_name := TG_TABLE_NAME || '.' || lower(TG_OP);
  actor_id_text := COALESCE((SELECT auth.uid())::TEXT, 'system');

  SELECT COALESCE(NULLIF(btrim(profile.full_name), ''), 'System')
  INTO actor_name_text
  FROM public.profiles AS profile
  WHERE profile.id = (SELECT auth.uid());
  actor_name_text := COALESCE(actor_name_text, 'System');

  IF TG_TABLE_NAME = 'teams' THEN
    details_json := jsonb_build_object(
      'team_id', changed_resource_id,
      'name', COALESCE(NEW.name, OLD.name),
      'slug', COALESCE(NEW.slug, OLD.slug),
      'status', COALESCE(NEW.status, OLD.status)
    );
  ELSE
    details_json := jsonb_build_object(
      'membership_id', changed_resource_id,
      'team_id', COALESCE(NEW.team_id, OLD.team_id),
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'membership_role', COALESCE(NEW.membership_role, OLD.membership_role)
    );
  END IF;

  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    actor_name,
    action,
    target_resource,
    details,
    severity
  ) VALUES (
    changed_workspace_id,
    actor_id_text,
    actor_name_text,
    action_name,
    TG_TABLE_NAME || ':' || changed_resource_id::TEXT,
    details_json::TEXT,
    'low'
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_teams_change ON public.teams;
CREATE TRIGGER audit_teams_change
  AFTER INSERT OR UPDATE OR DELETE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_team_change();

DROP TRIGGER IF EXISTS audit_team_memberships_change ON public.team_memberships;
CREATE TRIGGER audit_team_memberships_change
  AFTER INSERT OR UPDATE OR DELETE ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_team_change();

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.teams, public.team_memberships FROM anon, authenticated;
GRANT SELECT ON TABLE public.teams, public.team_memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.teams, public.team_memberships TO authenticated;

DROP POLICY IF EXISTS "Permitted workspace members can view teams" ON public.teams;
CREATE POLICY "Permitted workspace members can view teams"
  ON public.teams
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR private.is_team_member(id)
  );

DROP POLICY IF EXISTS "Workspace administrators can manage teams" ON public.teams;
CREATE POLICY "Workspace administrators can manage teams"
  ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace administrators can update teams"
  ON public.teams
  FOR UPDATE TO authenticated
  USING (private.is_workspace_admin(workspace_id))
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace administrators can delete teams"
  ON public.teams
  FOR DELETE TO authenticated
  USING (private.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Permitted workspace members can view team memberships" ON public.team_memberships;
CREATE POLICY "Permitted workspace members can view team memberships"
  ON public.team_memberships
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR private.is_team_member(team_id)
    OR user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Workspace administrators can manage team memberships" ON public.team_memberships;
CREATE POLICY "Workspace administrators can manage team memberships"
  ON public.team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace administrators can update team memberships"
  ON public.team_memberships
  FOR UPDATE TO authenticated
  USING (private.is_workspace_admin(workspace_id))
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace administrators can delete team memberships"
  ON public.team_memberships
  FOR DELETE TO authenticated
  USING (private.is_workspace_admin(workspace_id));

COMMENT ON TABLE public.teams IS
  'Workspace teams. Team scope is enabled separately after existing data is assigned.';
COMMENT ON TABLE public.team_memberships IS
  'Historical team memberships. Active operators may belong to one team; Team Leaders may lead multiple teams.';
