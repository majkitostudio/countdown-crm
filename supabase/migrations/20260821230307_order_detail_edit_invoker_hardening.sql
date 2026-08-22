-- Keep the public order edit RPC under the caller's RLS context. The
-- transaction-local flag is set only inside the RPC after all authorization
-- and validation checks have passed, so direct history inserts remain closed.
ALTER FUNCTION public.update_order_with_items(UUID, INTEGER, JSONB, TEXT, TEXT, TEXT)
  SECURITY INVOKER;

DROP POLICY IF EXISTS "Workspace roles can append order change history" ON public.order_change_history;
CREATE POLICY "Workspace roles can append order change history" ON public.order_change_history
  FOR INSERT TO authenticated
  WITH CHECK (
    current_setting('countdown.order_edit_rpc', true) = 'on'
    AND actor_id = (SELECT auth.uid())
    AND private.can_edit_order_details(workspace_id, order_id)
  );

GRANT INSERT ON public.order_change_history TO authenticated;
