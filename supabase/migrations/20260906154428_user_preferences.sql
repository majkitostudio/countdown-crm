-- Persist personal preferences per authenticated user and workspace. These
-- values follow the account instead of remaining tied to one browser.
CREATE TABLE public.workspace_user_preferences (
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ringtone_volume SMALLINT NOT NULL DEFAULT 80,
  client_profile_density TEXT NOT NULL DEFAULT 'full',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_user_preferences_pkey
    PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_user_preferences_membership_fkey
    FOREIGN KEY (workspace_id, user_id)
    REFERENCES public.workspace_members(workspace_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT workspace_user_preferences_ringtone_volume_check
    CHECK (ringtone_volume BETWEEN 0 AND 100),
  CONSTRAINT workspace_user_preferences_density_check
    CHECK (client_profile_density IN ('full', 'compact'))
);

ALTER TABLE public.workspace_user_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_user_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.workspace_user_preferences TO authenticated;

CREATE POLICY "Users can view own workspace preferences"
  ON public.workspace_user_preferences
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can create own workspace preferences"
  ON public.workspace_user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can update own workspace preferences"
  ON public.workspace_user_preferences
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE OR REPLACE FUNCTION private.prepare_workspace_user_preferences_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Preference identity cannot be changed';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_workspace_user_preferences_update()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workspace_user_preferences_prepare_update
  BEFORE UPDATE ON public.workspace_user_preferences
  FOR EACH ROW EXECUTE FUNCTION private.prepare_workspace_user_preferences_update();
