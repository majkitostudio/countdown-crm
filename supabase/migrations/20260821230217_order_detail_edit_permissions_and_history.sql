-- Enforce order-detail editing at the database boundary and keep a durable,
-- structured before/after record for every successful edit.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_revision_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_revision_check CHECK (revision >= 1);

CREATE TABLE IF NOT EXISTS public.order_change_history (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  change_kind TEXT NOT NULL DEFAULT 'details_updated',
  reason TEXT,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_change_history_kind_check
    CHECK (change_kind IN ('details_updated')),
  CONSTRAINT order_change_history_reason_length_check
    CHECK (reason IS NULL OR char_length(reason) <= 500)
);

CREATE INDEX IF NOT EXISTS order_change_history_order_id_created_at_idx
  ON public.order_change_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_change_history_workspace_id_idx
  ON public.order_change_history(workspace_id);

ALTER TABLE public.order_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace roles can view order change history" ON public.order_change_history;
CREATE POLICY "Workspace roles can view order change history" ON public.order_change_history
  FOR SELECT TO authenticated
  USING (private.can_access_order(workspace_id, order_id));

REVOKE ALL ON public.order_change_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.order_change_history TO authenticated;

CREATE OR REPLACE FUNCTION private.can_edit_order_details(
  target_workspace_id UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
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
        member.role = 'administrator'
        OR (
          member.role = 'team_leader'
          AND order_row.status IN ('pending', 'in_progress')
        )
        OR (
          member.role = 'operator'
          AND order_row.agent_id = (SELECT auth.uid())
          AND order_row.status IN ('pending', 'in_progress')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_edit_order_details(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_edit_order_details(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION private.prepare_order_update()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
      OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
      OR NEW.agent_id IS DISTINCT FROM OLD.agent_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Order ownership and creation fields are immutable';
    END IF;

    IF (
      NEW.product_id IS DISTINCT FROM OLD.product_id
      OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.order_source IS DISTINCT FROM OLD.order_source
      OR NEW.source_note IS DISTINCT FROM OLD.source_note
    )
    AND current_setting('countdown.order_edit_rpc', true) IS DISTINCT FROM 'on'
    AND NOT private.can_edit_order_details(OLD.workspace_id, OLD.id)
    THEN
      RAISE EXCEPTION 'Order details can no longer be edited by this workspace role';
    END IF;

    NEW.revision := OLD.revision + 1;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_order_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_prepare_update ON public.orders;
CREATE TRIGGER orders_prepare_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION private.prepare_order_update();

CREATE OR REPLACE FUNCTION private.guard_order_item_mutation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  item_workspace_id UUID;
  item_order_id UUID;
  item_product_id UUID;
  item_product_title TEXT;
  item_product_price NUMERIC;
  item_product_currency TEXT;
  item_product_in_stock BOOLEAN;
  expected_minimum NUMERIC;
  order_currency TEXT;
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  IF current_setting('countdown.order_edit_rpc', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    item_workspace_id := OLD.workspace_id;
    item_order_id := OLD.order_id;
    IF (SELECT count(*) FROM public.order_items WHERE order_id = OLD.order_id) <= 1 THEN
      RAISE EXCEPTION 'An order must contain at least one item';
    END IF;
  ELSE
    item_workspace_id := NEW.workspace_id;
    item_order_id := NEW.order_id;
    item_product_id := NEW.product_id;

    IF TG_OP = 'UPDATE' AND (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
      OR NEW.order_id IS DISTINCT FROM OLD.order_id
    ) THEN
      RAISE EXCEPTION 'Order item identity fields are immutable';
    END IF;

    IF NOT private.can_edit_order_details(item_workspace_id, item_order_id) THEN
      RAISE EXCEPTION 'Order items can no longer be edited by this workspace role';
    END IF;

    SELECT
      product.workspace_id,
      product.title,
      product.price,
      upper(coalesce(product.currency, 'USD')),
      coalesce(product.in_stock, true)
    INTO
      item_workspace_id,
      item_product_title,
      item_product_price,
      item_product_currency,
      item_product_in_stock
    FROM public.products AS product
    WHERE product.id = item_product_id;

    IF item_workspace_id IS NULL OR item_workspace_id <> NEW.workspace_id OR NOT item_product_in_stock THEN
      RAISE EXCEPTION 'Order item product is unavailable in the active workspace';
    END IF;

    SELECT order_row.currency
    INTO order_currency
    FROM public.orders AS order_row
    WHERE order_row.id = NEW.order_id
      AND order_row.workspace_id = NEW.workspace_id;

    IF order_currency IS NULL OR upper(order_currency) <> item_product_currency OR NEW.currency <> item_product_currency THEN
      RAISE EXCEPTION 'All order items must use the order currency';
    END IF;

    IF NEW.product_title_snapshot IS DISTINCT FROM item_product_title THEN
      RAISE EXCEPTION 'Order item product snapshot is invalid';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.product_id = OLD.product_id THEN
      expected_minimum := OLD.minimum_unit_price;
    ELSE
      expected_minimum := round(item_product_price, 2);
    END IF;

    IF NEW.minimum_unit_price IS DISTINCT FROM expected_minimum THEN
      RAISE EXCEPTION 'Order item minimum price snapshot is immutable';
    END IF;

    IF NEW.quantity < 1 OR NEW.quantity > 1000
      OR NEW.unit_price < 0 OR NEW.unit_price > 1000000000
      OR NEW.line_total IS DISTINCT FROM round(NEW.unit_price * NEW.quantity, 2)
    THEN
      RAISE EXCEPTION 'Order item pricing or quantity is invalid';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_order_item_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_guard_mutation ON public.order_items;
CREATE TRIGGER order_items_guard_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_order_item_mutation();

CREATE OR REPLACE FUNCTION private.sync_order_total_from_items()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  affected_order_id UUID := coalesce(NEW.order_id, OLD.order_id);
BEGIN
  IF current_setting('countdown.order_edit_rpc', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  UPDATE public.orders AS order_row
  SET
    total_amount = coalesce((SELECT sum(item.line_total) FROM public.order_items AS item WHERE item.order_id = affected_order_id), 0),
    product_id = (
      SELECT item.product_id
      FROM public.order_items AS item
      WHERE item.order_id = affected_order_id
      GROUP BY item.product_id
      HAVING count(*) = 1
      LIMIT 1
    )
  WHERE order_row.id = affected_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_order_total_from_items() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_sync_order_total ON public.order_items;
CREATE TRIGGER order_items_sync_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_order_total_from_items();

DROP POLICY IF EXISTS "Order creators can insert order items" ON public.order_items;
CREATE POLICY "Editable workspace members can insert order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_order_items(workspace_id, order_id));

DROP POLICY IF EXISTS "Editable workspace members can update order items" ON public.order_items;
CREATE POLICY "Editable workspace members can update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (private.can_edit_order_details(workspace_id, order_id))
  WITH CHECK (private.can_edit_order_details(workspace_id, order_id));

DROP POLICY IF EXISTS "Editable workspace members can delete order items" ON public.order_items;
CREATE POLICY "Editable workspace members can delete order items" ON public.order_items
  FOR DELETE TO authenticated
  USING (private.can_edit_order_details(workspace_id, order_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;

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
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.update_order_with_items(UUID, INTEGER, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_with_items(UUID, INTEGER, JSONB, TEXT, TEXT, TEXT) TO authenticated;
