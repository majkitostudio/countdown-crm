-- Fáze 3, krok 4: rizikové zásilky na výdejně jako výjimka `order:pickup_risk`.
-- Nový typ je workspace-scoped (řeší ho Team Leader), proto NENÍ mezi admin-only
-- výjimkami (workflow:failure, script:missing). Zdroj pravdy zůstává tabulka orders.

-- 1. Rozšířit povolené klíče výjimek o nový typ order:pickup_risk.
ALTER TABLE public.team_leader_exception_actions
  DROP CONSTRAINT IF EXISTS team_leader_exception_actions_exception_key_check;
ALTER TABLE public.team_leader_exception_actions
  ADD CONSTRAINT team_leader_exception_actions_exception_key_check
  CHECK (
    char_length(exception_key) BETWEEN 1 AND 250
    AND exception_key ~* '^(queue:(outcome_recovery|overdue_callback|expired_lease)|workflow:failure|script:missing|order:pickup_risk):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- 2. Rozšířit RLS politiky tak, aby Team Leader mohl spravovat i výjimky
--    order:pickup_risk ve svém workspace (stejně jako queue:*).
--    Administrátor zůstává workspace-wide.
DROP POLICY IF EXISTS "Managers can view scoped exception actions"
  ON public.team_leader_exception_actions;
DROP POLICY IF EXISTS "Managers can create scoped exception actions"
  ON public.team_leader_exception_actions;
DROP POLICY IF EXISTS "Managers can update scoped exception actions"
  ON public.team_leader_exception_actions;

CREATE POLICY "Managers can view scoped exception actions"
  ON public.team_leader_exception_actions
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (
      private.is_workspace_manager_or_admin(workspace_id)
      AND exception_key LIKE 'queue:%'
      AND EXISTS (
        SELECT 1
        FROM public.lead_queue_items AS queue_item
        WHERE queue_item.id = split_part(exception_key, ':', 3)::UUID
          AND queue_item.workspace_id = team_leader_exception_actions.workspace_id
      )
    )
    OR (
      private.is_workspace_manager_or_admin(workspace_id)
      AND exception_key LIKE 'order:pickup_risk:%'
      AND EXISTS (
        SELECT 1
        FROM public.orders AS pickup_order
        WHERE pickup_order.id = split_part(exception_key, ':', 3)::UUID
          AND pickup_order.workspace_id = team_leader_exception_actions.workspace_id
      )
    )
  );

CREATE POLICY "Managers can create scoped exception actions"
  ON public.team_leader_exception_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      private.is_workspace_admin(workspace_id)
      OR (
        private.is_workspace_manager_or_admin(workspace_id)
        AND exception_key LIKE 'queue:%'
        AND EXISTS (
          SELECT 1
          FROM public.lead_queue_items AS queue_item
          WHERE queue_item.id = split_part(exception_key, ':', 3)::UUID
            AND queue_item.workspace_id = team_leader_exception_actions.workspace_id
        )
      )
      OR (
        private.is_workspace_manager_or_admin(workspace_id)
        AND exception_key LIKE 'order:pickup_risk:%'
        AND EXISTS (
          SELECT 1
          FROM public.orders AS pickup_order
          WHERE pickup_order.id = split_part(exception_key, ':', 3)::UUID
            AND pickup_order.workspace_id = team_leader_exception_actions.workspace_id
        )
      )
    )
    AND actor_id = (SELECT auth.uid())
  );

CREATE POLICY "Managers can update scoped exception actions"
  ON public.team_leader_exception_actions
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_admin(workspace_id)
    OR (
      private.is_workspace_manager_or_admin(workspace_id)
      AND exception_key LIKE 'queue:%'
      AND EXISTS (
        SELECT 1
        FROM public.lead_queue_items AS queue_item
        WHERE queue_item.id = split_part(exception_key, ':', 3)::UUID
          AND queue_item.workspace_id = team_leader_exception_actions.workspace_id
      )
    )
    OR (
      private.is_workspace_manager_or_admin(workspace_id)
      AND exception_key LIKE 'order:pickup_risk:%'
      AND EXISTS (
        SELECT 1
        FROM public.orders AS pickup_order
        WHERE pickup_order.id = split_part(exception_key, ':', 3)::UUID
          AND pickup_order.workspace_id = team_leader_exception_actions.workspace_id
      )
    )
  )
  WITH CHECK (
    (
      private.is_workspace_admin(workspace_id)
      OR (
        private.is_workspace_manager_or_admin(workspace_id)
        AND exception_key LIKE 'queue:%'
        AND EXISTS (
          SELECT 1
          FROM public.lead_queue_items AS queue_item
          WHERE queue_item.id = split_part(exception_key, ':', 3)::UUID
            AND queue_item.workspace_id = team_leader_exception_actions.workspace_id
        )
      )
      OR (
        private.is_workspace_manager_or_admin(workspace_id)
        AND exception_key LIKE 'order:pickup_risk:%'
        AND EXISTS (
          SELECT 1
          FROM public.orders AS pickup_order
          WHERE pickup_order.id = split_part(exception_key, ':', 3)::UUID
            AND pickup_order.workspace_id = team_leader_exception_actions.workspace_id
        )
      )
    )
    AND actor_id = (SELECT auth.uid())
  );

-- 3. Aktualizovat guard aktivního zdroje: nová větev order:pickup_risk.
--    Vychází z poslední verze (20260914152000_team_leader_exception_scope).
CREATE OR REPLACE FUNCTION private.assert_team_leader_exception_active(
  p_workspace_id UUID,
  p_exception_key TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  exception_type TEXT;
  source_id UUID;
  source_occurred_at TIMESTAMPTZ;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Team Leader or Administrator access is required';
  END IF;

  IF p_exception_key IS NULL
     OR p_exception_key !~* '^(queue:(outcome_recovery|overdue_callback|expired_lease)|workflow:failure|script:missing|order:pickup_risk):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Exception key is invalid';
  END IF;

  exception_type := split_part(p_exception_key, ':', 1) || ':' || split_part(p_exception_key, ':', 2);
  source_id := split_part(p_exception_key, ':', 3)::UUID;

  IF exception_type IN ('workflow:failure', 'script:missing')
     AND NOT private.is_workspace_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Only Administrators can manage workspace-global exceptions';
  END IF;

  CASE exception_type
    WHEN 'queue:outcome_recovery' THEN
      SELECT queue_item.updated_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND (queue_item.recovery_required OR queue_item.state = 'awaiting_outcome');
    WHEN 'queue:overdue_callback' THEN
      SELECT queue_item.scheduled_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND queue_item.state = 'waiting_callback'
        AND queue_item.scheduled_at < NOW();
    WHEN 'queue:expired_lease' THEN
      SELECT queue_item.lease_expires_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND queue_item.state = 'assigned'
        AND queue_item.lease_expires_at < NOW();
    WHEN 'order:pickup_risk' THEN
      SELECT pickup_order.package_arrived_at + INTERVAL '3 days'
        INTO source_occurred_at
      FROM public.orders AS pickup_order
      WHERE pickup_order.id = source_id
        AND pickup_order.workspace_id = p_workspace_id
        AND pickup_order.status = 'sent'
        AND NULLIF(BTRIM(pickup_order.package_location), '') IS NOT NULL
        AND pickup_order.package_arrived_at IS NOT NULL
        AND pickup_order.package_arrived_at + INTERVAL '3 days' <= NOW()
        AND pickup_order.pickup_call_completed_at IS NULL;
    WHEN 'workflow:failure' THEN
      SELECT execution.created_at
        INTO source_occurred_at
      FROM public.workflow_executions AS execution
      WHERE execution.id = source_id
        AND execution.workspace_id = p_workspace_id
        AND execution.status = 'failure';
    WHEN 'script:missing' THEN
      SELECT product.created_at
        INTO source_occurred_at
      FROM public.products AS product
      WHERE product.id = source_id
        AND product.workspace_id = p_workspace_id
        AND product.in_stock
        AND NOT EXISTS (
          SELECT 1
          FROM public.product_scripts AS script
          WHERE script.workspace_id = product.workspace_id
            AND script.product_id = product.id
        );
  END CASE;

  IF source_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Exception is no longer active';
  END IF;

  RETURN source_occurred_at;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_team_leader_exception_active(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.assert_team_leader_exception_active(UUID, TEXT)
  TO authenticated;
