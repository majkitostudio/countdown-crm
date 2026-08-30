-- Keep each business mutation and its audit trail in one database transaction.
-- SECURITY INVOKER preserves the caller's RLS context; the explicit role check
-- keeps this contract aligned with the server-side DAL authorization boundary.

CREATE OR REPLACE FUNCTION public.update_lead_status_with_audit(
  p_workspace_id UUID,
  p_lead_id UUID,
  p_status TEXT
)
RETURNS public.leads
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  lead_row public.leads;
  actor_name TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to update a lead';
  END IF;

  IF p_workspace_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'User is not authorized for the active workspace';
  END IF;

  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead id is required';
  END IF;

  IF p_status NOT IN ('new', 'contacted', 'qualified', 'customer', 'unresponsive') THEN
    RAISE EXCEPTION 'Invalid lead status';
  END IF;

  SELECT lead.*
  INTO lead_row
  FROM public.leads AS lead
  WHERE lead.id = p_lead_id
    AND lead.workspace_id = p_workspace_id
    AND private.is_workspace_manager_or_admin(lead.workspace_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found in the active workspace';
  END IF;

  -- Desired-state retries are no-ops after the first committed change, so a
  -- retried request cannot create a duplicate audit event.
  IF lead_row.status IS NOT DISTINCT FROM p_status THEN
    RETURN lead_row;
  END IF;

  SELECT profile.full_name
  INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  UPDATE public.leads
  SET status = p_status,
      updated_at = NOW()
  WHERE id = lead_row.id
    AND workspace_id = p_workspace_id
  RETURNING * INTO lead_row;

  -- Any audit insert error aborts this function's transaction, rolling back
  -- the lead update instead of exposing a business/audit partial result.
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
    p_workspace_id,
    current_user_id::TEXT,
    COALESCE(actor_name, 'Unknown operator'),
    'LEAD_UPDATE',
    'Lead',
    format('Lead %s status changed to %s', p_lead_id, p_status),
    'low',
    'server'
  );

  RETURN lead_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_lead_status_with_audit(UUID, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_lead_status_with_audit(UUID, UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.reassign_orders_product_with_audit(
  p_workspace_id UUID,
  p_source_product_id UUID,
  p_target_product_id UUID
)
RETURNS TABLE (
  source_product_id UUID,
  target_product_id UUID,
  moved_order_ids UUID[]
)
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  source_product RECORD;
  target_product RECORD;
  actor_name TEXT;
  moved_ids UUID[];
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to reassign orders';
  END IF;

  IF p_workspace_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'User is not authorized for the active workspace';
  END IF;

  IF p_source_product_id IS NULL OR p_target_product_id IS NULL
    OR p_source_product_id = p_target_product_id
  THEN
    RAISE EXCEPTION 'Source and target products must be different';
  END IF;

  SELECT product.id, product.workspace_id, product.title
  INTO source_product
  FROM public.products AS product
  WHERE product.id = p_source_product_id
    AND product.workspace_id = p_workspace_id
    AND private.is_workspace_manager_or_admin(product.workspace_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Both products must belong to the active workspace';
  END IF;

  SELECT product.id, product.workspace_id, product.title
  INTO target_product
  FROM public.products AS product
  WHERE product.id = p_target_product_id
    AND product.workspace_id = p_workspace_id
    AND private.is_workspace_manager_or_admin(product.workspace_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Both products must belong to the active workspace';
  END IF;

  -- Serialize retries and competing moves for a source product.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::TEXT || ':' || p_source_product_id::TEXT, 0)
  );

  -- Lock both product rows in deterministic order before changing orders.
  PERFORM 1
  FROM public.products AS product
  WHERE product.workspace_id = p_workspace_id
    AND product.id IN (p_source_product_id, p_target_product_id)
  ORDER BY product.id
  FOR UPDATE;

  SELECT profile.full_name
  INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  -- The existing order trigger uses this transaction-local flag for
  -- authorized server mutations. Authorization was checked above.
  PERFORM set_config('countdown.order_edit_rpc', 'on', true);

  WITH moved AS (
    UPDATE public.orders AS order_row
    SET product_id = p_target_product_id
    WHERE order_row.workspace_id = p_workspace_id
      AND order_row.product_id = p_source_product_id
    RETURNING order_row.id
  )
  SELECT COALESCE(array_agg(moved.id ORDER BY moved.id), ARRAY[]::UUID[])
  INTO moved_ids
  FROM moved;

  -- A retry that finds no source rows is a desired-state no-op. If the audit
  -- insert fails, the transaction aborts and rolls back the order update.
  IF COALESCE(cardinality(moved_ids), 0) > 0 THEN
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
      p_workspace_id,
      current_user_id::TEXT,
      COALESCE(actor_name, 'Unknown operator'),
      'ORDER_PRODUCT_REASSIGNED',
      'Order',
      format(
        'Reassigned %s order(s) from %s to %s. Historical order totals were preserved.',
        cardinality(moved_ids),
        source_product.title,
        target_product.title
      ),
      'medium',
      'server'
    );
  END IF;

  RETURN QUERY SELECT p_source_product_id, p_target_product_id, moved_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_orders_product_with_audit(UUID, UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reassign_orders_product_with_audit(UUID, UUID, UUID)
  TO authenticated;
