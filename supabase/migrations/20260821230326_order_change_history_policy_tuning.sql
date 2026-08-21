CREATE INDEX IF NOT EXISTS order_change_history_actor_id_idx
  ON public.order_change_history(actor_id);

DROP POLICY IF EXISTS "Workspace roles can append order change history" ON public.order_change_history;
CREATE POLICY "Workspace roles can append order change history" ON public.order_change_history
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT current_setting('countdown.order_edit_rpc', true)) = 'on'
    AND actor_id = (SELECT auth.uid())
    AND private.can_edit_order_details(workspace_id, order_id)
  );
