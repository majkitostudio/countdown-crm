-- Track order lifecycle changes separately from the central security audit.
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_status_history_from_status_check
    CHECK (from_status IS NULL OR from_status IN ('completed', 'pending', 'in_progress', 'sent', 'cancelled', 'delivered', 'returned')),
  CONSTRAINT order_status_history_to_status_check
    CHECK (to_status IN ('completed', 'pending', 'in_progress', 'sent', 'cancelled', 'delivered', 'returned')),
  CONSTRAINT order_status_history_note_length_check
    CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_created_at_idx
  ON public.order_status_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_status_history_workspace_id_idx
  ON public.order_status_history(workspace_id);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.can_access_order(
  target_workspace_id UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    JOIN public.orders AS order_row
      ON order_row.id = target_order_id
     AND order_row.workspace_id = target_workspace_id
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = (SELECT auth.uid())
      AND (
        member.role IN ('team_leader', 'administrator')
        OR order_row.agent_id = (SELECT auth.uid())
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_access_order(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_order(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Workspace roles can view order status history" ON public.order_status_history;
CREATE POLICY "Workspace roles can view order status history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (private.can_access_order(workspace_id, order_id));

GRANT SELECT ON public.order_status_history TO authenticated;

CREATE OR REPLACE FUNCTION private.can_update_order_status(
  target_workspace_id UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.can_access_order(target_workspace_id, target_order_id);
$$;

REVOKE ALL ON FUNCTION private.can_update_order_status(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_update_order_status(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Team Leaders and Administrators can update orders" ON public.orders;
DROP POLICY IF EXISTS "Workspace managers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Workspace members can update own orders" ON public.orders;
CREATE POLICY "Workspace members can update own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (private.can_update_order_status(workspace_id, id))
  WITH CHECK (private.can_update_order_status(workspace_id, id));

CREATE OR REPLACE FUNCTION private.record_order_status_history()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_actor_id UUID := (SELECT auth.uid());
  current_actor_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT profile.full_name
  INTO current_actor_name
  FROM public.profiles AS profile
  WHERE profile.id = current_actor_id;

  INSERT INTO public.order_status_history (
    workspace_id,
    order_id,
    from_status,
    to_status,
    actor_id,
    actor_name,
    note
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    NEW.status,
    coalesce(current_actor_id, NEW.agent_id),
    coalesce(current_actor_name, 'System'),
    CASE WHEN TG_OP = 'INSERT' THEN 'Order created' ELSE NULL END
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_order_status_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_record_status_history ON public.orders;
CREATE TRIGGER orders_record_status_history
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION private.record_order_status_history();

INSERT INTO public.order_status_history (
  workspace_id,
  order_id,
  from_status,
  to_status,
  actor_id,
  actor_name,
  note
)
SELECT
  order_row.workspace_id,
  order_row.id,
  NULL,
  order_row.status,
  order_row.agent_id,
  coalesce(profile.full_name, 'System'),
  'Imported current status'
FROM public.orders AS order_row
LEFT JOIN public.profiles AS profile ON profile.id = order_row.agent_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.order_status_history AS history
  WHERE history.order_id = order_row.id
);

CREATE OR REPLACE FUNCTION public.update_order_status_with_history(
  p_order_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  order_row public.orders;
  current_user_id UUID := (SELECT auth.uid());
  is_manager BOOLEAN;
  actor_name TEXT;
  previous_status TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to update an order';
  END IF;

  IF p_status NOT IN ('completed', 'pending', 'in_progress', 'sent', 'cancelled', 'delivered', 'returned') THEN
    RAISE EXCEPTION 'Unsupported order status';
  END IF;

  IF p_note IS NOT NULL AND char_length(trim(p_note)) > 500 THEN
    RAISE EXCEPTION 'Order status note is too long';
  END IF;

  SELECT *
  INTO order_row
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND OR NOT private.can_update_order_status(order_row.workspace_id, order_row.id) THEN
    RAISE EXCEPTION 'Order is not available for status updates';
  END IF;

  IF order_row.status = p_status THEN
    RAISE EXCEPTION 'Order already has this status';
  END IF;

  previous_status := order_row.status;

  is_manager := private.is_workspace_manager_or_admin(order_row.workspace_id);
  IF NOT is_manager AND NOT (
    (order_row.status = 'pending' AND p_status IN ('in_progress', 'cancelled'))
    OR (order_row.status = 'in_progress' AND p_status IN ('sent', 'cancelled'))
    OR (order_row.status = 'sent' AND p_status IN ('delivered', 'returned', 'cancelled'))
    OR (order_row.status = 'delivered' AND p_status = 'returned')
    OR (order_row.status = 'completed' AND p_status IN ('in_progress', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'This status transition is not available for the current operator';
  END IF;

  SELECT profile.full_name
  INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  UPDATE public.orders
  SET status = p_status
  WHERE id = p_order_id
  RETURNING * INTO order_row;

  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    actor_name,
    action,
    target_resource,
    details,
    severity,
    ip_address
  )
  VALUES (
    order_row.workspace_id,
    current_user_id::TEXT,
    coalesce(actor_name, 'Unknown operator'),
    'ORDER_STATUS_CHANGED',
    'Order',
    format('Order %s status changed from %s to %s%s', order_row.id, previous_status, p_status, CASE WHEN p_note IS NOT NULL AND trim(p_note) <> '' THEN format(': %s', trim(p_note)) ELSE '' END),
    'low',
    'server'
  );

  RETURN order_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status_with_history(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_with_history(UUID, TEXT, TEXT) TO authenticated;
