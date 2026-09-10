CREATE TABLE public.training_review_revisions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  verdict TEXT NOT NULL CHECK (char_length(btrim(verdict)) BETWEEN 1 AND 200),
  coaching_note TEXT NOT NULL CHECK (char_length(btrim(coaching_note)) BETWEEN 3 AND 4000),
  correction_reason TEXT CHECK (correction_reason IS NULL OR char_length(btrim(correction_reason)) BETWEEN 3 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, revision_number)
);

CREATE INDEX training_review_revisions_workspace_session_idx
  ON public.training_review_revisions(workspace_id, session_id, revision_number DESC);

ALTER TABLE public.training_review_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view training review revisions"
  ON public.training_review_revisions FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Managers can create training review revisions"
  ON public.training_review_revisions FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND private.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.training_sessions session
      WHERE session.id = training_review_revisions.session_id
        AND session.workspace_id = training_review_revisions.workspace_id
    )
  );

GRANT SELECT, INSERT ON public.training_review_revisions TO authenticated;
