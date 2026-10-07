-- 20261007120000_manager_order_fulfillment_status_updates.sql
-- Enables Team Leaders and Administrators to transition orders into logistics
-- and fulfillment states (sent, delivered, returned) directly from the CRM.
-- When a manager marks an order as delivered or returned, the transaction
-- establishes the fulfillment event context required by the fulfillment guard,
-- enabling orders_post_wallet_reward to post the operator commission bonus.

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
  fulfillment_event TEXT;
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
  IF NOT is_manager THEN
    IF p_status IN ('delivered', 'returned') THEN
      RAISE EXCEPTION 'Only workspace managers can mark orders as delivered or returned';
    END IF;
    IF NOT (
      (order_row.status = 'pending' AND p_status IN ('in_progress', 'cancelled'))
      OR (order_row.status = 'in_progress' AND p_status IN ('sent', 'cancelled'))
      OR (order_row.status = 'sent' AND p_status IN ('cancelled'))
      OR (order_row.status = 'completed' AND p_status IN ('in_progress', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'This status transition is not available for the current operator';
    END IF;
  END IF;

  SELECT profile.full_name
  INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  IF is_manager AND p_status IN ('delivered', 'returned') THEN
    fulfillment_event := 'manager:' || current_user_id::TEXT || ':' || extract(epoch from clock_timestamp())::TEXT;
    PERFORM set_config('countdown.fulfillment_event_id', fulfillment_event, true);

    IF p_status = 'delivered' THEN
      UPDATE public.orders
      SET status = p_status,
          delivered_at = coalesce(delivered_at, clock_timestamp()),
          fulfillment_event_id = coalesce(fulfillment_event_id, fulfillment_event)
      WHERE id = p_order_id
      RETURNING * INTO order_row;
    ELSE
      -- returned
      UPDATE public.orders
      SET status = p_status,
          returned_at = coalesce(returned_at, clock_timestamp()),
          fulfillment_event_id = coalesce(fulfillment_event_id, fulfillment_event)
      WHERE id = p_order_id
      RETURNING * INTO order_row;
    END IF;
  ELSE
    UPDATE public.orders
    SET status = p_status
    WHERE id = p_order_id
    RETURNING * INTO order_row;
  END IF;

  IF p_note IS NOT NULL AND trim(p_note) <> '' THEN
    UPDATE public.order_status_history
    SET note = trim(p_note)
    WHERE id = (
      SELECT id FROM public.order_status_history
      WHERE order_id = p_order_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

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

COMMENT ON FUNCTION public.update_order_status_with_history(UUID, TEXT, TEXT) IS
  'Updates order lifecycle status with audit logs, status history note recording, and manager-authorized delivery/return events that trigger operator wallet rewards.';
