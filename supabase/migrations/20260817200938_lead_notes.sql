-- Persist operator quick notes as workspace-scoped lead activities.
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_notes_workspace_lead_created_idx
  ON public.lead_notes (workspace_id, lead_id, created_at DESC);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view lead notes" ON public.lead_notes
  FOR SELECT USING (
    workspace_id IS NOT NULL
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Workspace members can create lead notes" ON public.lead_notes
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL
    AND private.is_workspace_member(workspace_id)
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.leads AS lead
      WHERE lead.id = lead_notes.lead_id
        AND lead.workspace_id = lead_notes.workspace_id
    )
  );

DROP TRIGGER IF EXISTS lead_notes_workspace_immutable ON public.lead_notes;
CREATE TRIGGER lead_notes_workspace_immutable
  BEFORE UPDATE OF workspace_id ON public.lead_notes
  FOR EACH ROW EXECUTE FUNCTION private.prevent_workspace_change();

GRANT SELECT, INSERT ON TABLE public.lead_notes TO authenticated;
