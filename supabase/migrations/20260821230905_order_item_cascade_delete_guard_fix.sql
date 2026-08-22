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
