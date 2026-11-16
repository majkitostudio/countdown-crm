-- Reject order writes when a product has no stored currency. The order and
-- order-item triggers run inside the caller's transaction, covering manual
-- orders and both call-completion paths without relying on an application
-- preflight check.

CREATE OR REPLACE FUNCTION private.sync_order_currency_from_product()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  product_currency TEXT;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(upper(btrim(product.currency)), '')
  INTO product_currency
  FROM public.products AS product
  WHERE product.id = NEW.product_id
    AND product.workspace_id = NEW.workspace_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order product does not belong to the order workspace';
  END IF;

  IF product_currency IS NULL THEN
    RAISE EXCEPTION 'Order product currency is required';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.currency := product_currency;
  ELSIF NULLIF(upper(btrim(NEW.currency)), '') IS DISTINCT FROM product_currency THEN
    RAISE EXCEPTION 'Order currency must match the product currency';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_order_item_currency_match()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  order_currency TEXT;
  order_workspace_id UUID;
  product_currency TEXT;
BEGIN
  SELECT order_row.workspace_id, NULLIF(upper(btrim(order_row.currency)), '')
  INTO order_workspace_id, order_currency
  FROM public.orders AS order_row
  WHERE order_row.id = NEW.order_id;

  IF order_workspace_id IS NULL OR order_workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Order item must belong to the same workspace as its order';
  END IF;

  SELECT NULLIF(upper(btrim(product.currency)), '')
  INTO product_currency
  FROM public.products AS product
  WHERE product.id = NEW.product_id
    AND product.workspace_id = NEW.workspace_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item product does not belong to the order workspace';
  END IF;

  IF product_currency IS NULL THEN
    RAISE EXCEPTION 'Order item product currency is required';
  END IF;

  IF order_currency IS NULL OR order_currency <> product_currency THEN
    RAISE EXCEPTION 'All order items must use the order currency';
  END IF;

  IF NULLIF(upper(btrim(NEW.currency)), '') IS DISTINCT FROM product_currency THEN
    RAISE EXCEPTION 'Order item currency must match the product currency';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_order_currency_from_product()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_order_item_currency_match()
  FROM PUBLIC, anon, authenticated;
