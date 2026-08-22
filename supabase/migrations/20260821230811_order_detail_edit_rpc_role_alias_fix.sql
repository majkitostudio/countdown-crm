CREATE OR REPLACE FUNCTION public.update_order_with_items(
  p_order_id UUID,
  p_expected_revision INTEGER,
  p_items JSONB,
  p_order_source TEXT,
  p_source_note TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  order_row public.orders;
  item RECORD;
  product_row RECORD;
  actor_name TEXT;
  workspace_role TEXT;
  order_currency TEXT;
  unit_price NUMERIC;
  minimum_unit_price NUMERIC;
  line_total NUMERIC;
  calculated_total_amount NUMERIC := 0;
  item_count INTEGER := 0;
  first_product_id UUID;
  before_state JSONB;
  after_state JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to edit an order';
  END IF;

  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'Order revision is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Order must contain between 1 and 50 items';
  END IF;

  IF p_order_source NOT IN ('previous_call', 'email', 'web_form', 'manual', 'other') THEN
    RAISE EXCEPTION 'Unsupported order source';
  END IF;

  IF p_source_note IS NOT NULL AND char_length(trim(p_source_note)) > 1000 THEN
    RAISE EXCEPTION 'Order source note is too long';
  END IF;

  IF p_reason IS NOT NULL AND char_length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'Order edit reason is too long';
  END IF;

  SELECT *
  INTO order_row
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order is not available in the active workspace';
  END IF;

  SELECT member.role
  INTO workspace_role
  FROM public.workspace_members AS member
  WHERE member.workspace_id = order_row.workspace_id
    AND member.user_id = current_user_id
  LIMIT 1;

  IF workspace_role IS NULL OR NOT private.can_edit_order_details(order_row.workspace_id, order_row.id) THEN
    RAISE EXCEPTION 'Order details can no longer be edited by this workspace role';
  END IF;

  IF order_row.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Order changed since it was opened. Reload and try again.';
  END IF;

  IF order_row.status NOT IN ('pending', 'in_progress')
    AND (workspace_role <> 'administrator' OR NULLIF(trim(p_reason), '') IS NULL)
  THEN
    RAISE EXCEPTION 'An administrator and a reason are required to edit this order after it was sent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    GROUP BY product_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Each product may appear only once in an order';
  END IF;

  SELECT jsonb_build_object(
    'order_source', order_row.order_source,
    'source_note', order_row.source_note,
    'total_amount', order_row.total_amount,
    'currency', order_row.currency,
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', order_item_row.product_id,
        'product_title', order_item_row.product_title_snapshot,
        'quantity', order_item_row.quantity,
        'unit_price', order_item_row.unit_price,
        'minimum_unit_price', order_item_row.minimum_unit_price,
        'line_total', order_item_row.line_total,
        'currency', order_item_row.currency
      ) ORDER BY order_item_row.id)
      FROM public.order_items AS order_item_row
      WHERE order_item_row.order_id = order_row.id
    ), '[]'::jsonb)
  )
  INTO before_state;

  FOR item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS input_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
  LOOP
    IF item.product_id IS NULL THEN
      RAISE EXCEPTION 'Order item product is required';
    END IF;
    IF item.quantity IS NULL OR item.quantity < 1 OR item.quantity > 1000 THEN
      RAISE EXCEPTION 'Order item quantity must be between 1 and 1000';
    END IF;
    IF item.unit_price IS NULL OR item.unit_price < 0 OR item.unit_price > 1000000000 THEN
      RAISE EXCEPTION 'Order item unit price must be between 0 and 1000000000';
    END IF;

    SELECT product.id, product.title, product.price, upper(coalesce(product.currency, 'USD')) AS currency, coalesce(product.in_stock, true) AS in_stock
    INTO product_row
    FROM public.products AS product
    WHERE product.id = item.product_id
      AND product.workspace_id = order_row.workspace_id;

    IF NOT FOUND OR NOT product_row.in_stock THEN
      RAISE EXCEPTION 'Order item product is unavailable in the active workspace';
    END IF;

    IF order_currency IS NULL THEN
      order_currency := product_row.currency;
      first_product_id := product_row.id;
    ELSIF product_row.currency <> order_currency THEN
      RAISE EXCEPTION 'All order items must use the same currency';
    END IF;

    SELECT old_item.minimum_unit_price
    INTO minimum_unit_price
    FROM public.order_items AS old_item
    WHERE old_item.order_id = order_row.id
      AND old_item.product_id = product_row.id;

    minimum_unit_price := round(coalesce(minimum_unit_price, product_row.price), 2);
    unit_price := round(item.unit_price, 2);
    line_total := round(unit_price * item.quantity, 2);
    calculated_total_amount := calculated_total_amount + line_total;
    item_count := item_count + 1;
  END LOOP;

  IF order_currency IS NULL OR item_count = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  PERFORM set_config('countdown.order_edit_rpc', 'on', true);

  UPDATE public.orders
  SET
    product_id = CASE WHEN item_count = 1 THEN first_product_id ELSE NULL END,
    total_amount = calculated_total_amount,
    currency = order_currency,
    order_source = p_order_source,
    source_note = NULLIF(trim(p_source_note), '')
  WHERE id = order_row.id
  RETURNING * INTO order_row;

  DELETE FROM public.order_items
  WHERE order_id = order_row.id;

  FOR item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS input_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
  LOOP
    SELECT product.id, product.title, product.price, upper(coalesce(product.currency, 'USD')) AS currency
    INTO product_row
    FROM public.products AS product
    WHERE product.id = item.product_id
      AND product.workspace_id = order_row.workspace_id;

    minimum_unit_price := NULL;
    SELECT (old_item->>'minimum_unit_price')::NUMERIC
    INTO minimum_unit_price
    FROM jsonb_array_elements(coalesce(before_state->'items', '[]'::jsonb)) AS old_item
    WHERE old_item->>'product_id' = product_row.id::TEXT
    LIMIT 1;

    -- Existing products retain their original minimum-price snapshot. New
    -- products use the current catalog price as their first snapshot.
    minimum_unit_price := round(coalesce(minimum_unit_price, product_row.price), 2);
    unit_price := round(item.unit_price, 2);
    line_total := round(unit_price * item.quantity, 2);

    INSERT INTO public.order_items (
      workspace_id,
      order_id,
      product_id,
      product_title_snapshot,
      unit_price,
      minimum_unit_price,
      quantity,
      line_total,
      currency
    )
    VALUES (
      order_row.workspace_id,
      order_row.id,
      product_row.id,
      product_row.title,
      unit_price,
      minimum_unit_price,
      item.quantity,
      line_total,
      product_row.currency
    );
  END LOOP;

  SELECT jsonb_build_object(
    'order_source', order_row.order_source,
    'source_note', order_row.source_note,
    'total_amount', order_row.total_amount,
    'currency', order_row.currency,
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', order_item_row.product_id,
        'product_title', order_item_row.product_title_snapshot,
        'quantity', order_item_row.quantity,
        'unit_price', order_item_row.unit_price,
        'minimum_unit_price', order_item_row.minimum_unit_price,
        'line_total', order_item_row.line_total,
        'currency', order_item_row.currency
      ) ORDER BY order_item_row.id)
      FROM public.order_items AS order_item_row
      WHERE order_item_row.order_id = order_row.id
    ), '[]'::jsonb)
  )
  INTO after_state;

  SELECT profile.full_name
  INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  INSERT INTO public.order_change_history (
    workspace_id,
    order_id,
    actor_id,
    actor_name,
    reason,
    before_state,
    after_state
  )
  VALUES (
    order_row.workspace_id,
    order_row.id,
    current_user_id,
    coalesce(actor_name, 'Unknown operator'),
    NULLIF(trim(p_reason), ''),
    before_state,
    after_state
  );

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
    'ORDER_DETAILS_UPDATED',
    'Order',
    format('Order %s details updated in %s status%s', order_row.id, order_row.status, CASE WHEN NULLIF(trim(p_reason), '') IS NOT NULL THEN format(': %s', trim(p_reason)) ELSE '' END),
    CASE WHEN order_row.status IN ('sent', 'delivered', 'returned', 'cancelled', 'completed') THEN 'medium' ELSE 'low' END,
    'server'
  );

  RETURN order_row;
END;
$$;
