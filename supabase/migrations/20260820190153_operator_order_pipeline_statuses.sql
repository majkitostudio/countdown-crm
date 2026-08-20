-- Establish a truthful order-lifecycle contract without rewriting historical
-- sales-completion rows as logistics events that were never observed.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status IN (
      'completed',
      'pending',
      'in_progress',
      'sent',
      'cancelled',
      'delivered',
      'returned'
    )
  ) NOT VALID;

ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_status_check;

COMMENT ON COLUMN public.orders.status IS
  'Order lifecycle status. completed and pending are retained legacy sales states; in_progress, sent, cancelled, delivered, and returned are the operator pipeline states.';

-- Operators may read only orders attributed to their authenticated profile.
-- Team Leaders and Administrators retain workspace-wide visibility.
DROP POLICY IF EXISTS "Workspace members can view orders" ON public.orders;

CREATE POLICY "Workspace roles can view permitted orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND (
      private.is_workspace_manager_or_admin(workspace_id)
      OR (
        private.is_workspace_member(workspace_id)
        AND agent_id = (SELECT auth.uid())
      )
    )
  );

CREATE INDEX IF NOT EXISTS orders_pipeline_owner_status_created_idx
  ON public.orders (workspace_id, agent_id, status, created_at DESC);
