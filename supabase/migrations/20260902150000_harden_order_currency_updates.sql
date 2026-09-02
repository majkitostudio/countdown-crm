-- Keep the order currency immutable relative to its product on every write.

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

  SELECT upper(coalesce(product.currency, 'USD'))
  INTO product_currency
  FROM public.products AS product
  WHERE product.id = NEW.product_id
    AND product.workspace_id = NEW.workspace_id;

  IF product_currency IS NULL THEN
    RAISE EXCEPTION 'Order product does not belong to the order workspace';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.currency := product_currency;
  ELSIF upper(coalesce(NEW.currency, '')) <> product_currency THEN
    RAISE EXCEPTION 'Order currency must match the product currency';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_currency_from_product ON public.orders;
CREATE TRIGGER orders_sync_currency_from_product
BEFORE INSERT OR UPDATE OF product_id, currency ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.sync_order_currency_from_product();

REVOKE ALL ON FUNCTION private.sync_order_currency_from_product() FROM PUBLIC, anon, authenticated;
