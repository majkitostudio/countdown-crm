-- Evaluate the authenticated identity once per statement in the insert policy.
DROP POLICY IF EXISTS "Workspace members can create lead notes" ON public.lead_notes;

CREATE POLICY "Workspace members can create lead notes" ON public.lead_notes
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL
    AND private.is_workspace_member(workspace_id)
    AND author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.leads AS lead
      WHERE lead.id = lead_notes.lead_id
        AND lead.workspace_id = lead_notes.workspace_id
    )
  );
