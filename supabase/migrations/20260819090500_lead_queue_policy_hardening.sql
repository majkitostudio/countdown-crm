-- Remove redundant queue SELECT policies and add FK-supporting indexes.

DROP POLICY IF EXISTS "Workspace managers can view operator presence" ON public.operator_presence;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view operator presence" ON public.operator_presence;
DROP POLICY IF EXISTS "Operators can view own presence" ON public.operator_presence;
CREATE POLICY "Workspace members can view permitted operator presence"
  ON public.operator_presence
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      operator_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Workspace managers can view queue items" ON public.lead_queue_items;
DROP POLICY IF EXISTS "Team Leaders and Administrators can view queue items" ON public.lead_queue_items;
DROP POLICY IF EXISTS "Operators can view current queue item" ON public.lead_queue_items;
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
  );

CREATE INDEX IF NOT EXISTS operator_presence_operator_id_idx
  ON public.operator_presence (operator_id);

CREATE INDEX IF NOT EXISTS lead_queue_items_lead_id_idx
  ON public.lead_queue_items (lead_id);

CREATE INDEX IF NOT EXISTS lead_queue_items_assigned_operator_id_idx
  ON public.lead_queue_items (assigned_operator_id);

CREATE INDEX IF NOT EXISTS lead_queue_items_preferred_operator_id_idx
  ON public.lead_queue_items (preferred_operator_id);

CREATE INDEX IF NOT EXISTS lead_queue_events_lead_id_idx
  ON public.lead_queue_events (lead_id);

CREATE INDEX IF NOT EXISTS lead_queue_events_from_operator_id_idx
  ON public.lead_queue_events (from_operator_id);

CREATE INDEX IF NOT EXISTS lead_queue_events_to_operator_id_idx
  ON public.lead_queue_events (to_operator_id);

CREATE INDEX IF NOT EXISTS lead_queue_events_actor_id_idx
  ON public.lead_queue_events (actor_id);
