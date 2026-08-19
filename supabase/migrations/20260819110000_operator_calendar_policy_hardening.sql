-- Operators need to read their own waiting callbacks for the calendar. They
-- must not gain access to the available pool or another operator's callback.
DROP POLICY IF EXISTS "Workspace members can view permitted queue items" ON public.lead_queue_items;
CREATE POLICY "Workspace members can view permitted queue items"
  ON public.lead_queue_items
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      assigned_operator_id = (SELECT auth.uid())
      AND state IN ('assigned', 'in_progress')
      AND private.is_workspace_member(workspace_id)
    )
    OR (
      preferred_operator_id = (SELECT auth.uid())
      AND state = 'waiting_callback'
      AND private.is_workspace_member(workspace_id)
    )
  );
