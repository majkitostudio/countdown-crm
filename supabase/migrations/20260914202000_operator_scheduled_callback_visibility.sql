-- Operators may see their own scheduled callbacks in Calendar. This extends
-- the existing queue-item read policy only to waiting callbacks and does not
-- grant access to another operator's work or any mutation rights.

DROP POLICY IF EXISTS "Operators can view current queue item" ON public.lead_queue_items;
CREATE POLICY "Operators can view current queue item"
  ON public.lead_queue_items
  FOR SELECT
  TO authenticated
  USING (
    (
      assigned_operator_id = (SELECT auth.uid())
      AND state IN ('assigned', 'in_progress', 'awaiting_outcome')
      AND team_id IS NOT NULL
      AND private.is_team_member(team_id)
      AND private.is_workspace_member(workspace_id)
    )
    OR (
      preferred_operator_id = (SELECT auth.uid())
      AND state = 'waiting_callback'
      AND team_id IS NOT NULL
      AND private.is_team_member(team_id)
      AND private.is_workspace_member(workspace_id)
    )
  );
