-- Persist named filter views per authenticated user and workspace. Views are
-- only filter presets for the Team Workspace quality tab; they never widen the
-- team scope, which continues to be enforced when the review list itself loads.
CREATE TABLE public.workspace_saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'quality',
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_saved_views_pkey
    PRIMARY KEY (id),
  CONSTRAINT workspace_saved_views_name_unique
    UNIQUE (workspace_id, user_id, view_type, name),
  CONSTRAINT workspace_saved_views_membership_fkey
    FOREIGN KEY (workspace_id, user_id)
    REFERENCES public.workspace_members(workspace_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT workspace_saved_views_name_length_check
    CHECK (char_length(name) BETWEEN 1 AND 60),
  CONSTRAINT workspace_saved_views_type_check
    CHECK (view_type = 'quality')
);

ALTER TABLE public.workspace_saved_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_saved_views FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_saved_views TO authenticated;

CREATE POLICY "Users can view own saved views"
  ON public.workspace_saved_views
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can create own saved views"
  ON public.workspace_saved_views
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can update own saved views"
  ON public.workspace_saved_views
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can delete own saved views"
  ON public.workspace_saved_views
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE OR REPLACE FUNCTION private.prepare_workspace_saved_views_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.view_type IS DISTINCT FROM OLD.view_type
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Saved view identity cannot be changed';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_workspace_saved_views_update()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workspace_saved_views_prepare_update
  BEFORE UPDATE ON public.workspace_saved_views
  FOR EACH ROW EXECUTE FUNCTION private.prepare_workspace_saved_views_update();