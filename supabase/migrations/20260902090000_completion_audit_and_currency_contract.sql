-- Close two pilot gaps at the database boundary:
-- 1. every persisted call and call-created order gets an audit event in the
--    same transaction;
-- 2. an order and its immutable item snapshots cannot silently use different
--    currencies.

CREATE OR REPLACE FUNCTION private.audit_call_insert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
BEGIN
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
    NEW.workspace_id,
    COALESCE(NEW.agent_id::TEXT, 'system'),
    COALESCE((SELECT profile.full_name FROM public.profiles AS profile WHERE profile.id = NEW.agent_id), 'Unknown operator'),
    'CALL_COMPLETED',
    'Call',
    format('Call %s completed for lead %s with outcome %s', NEW.id, NEW.lead_id, NEW.outcome),
    'low',
    'server'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calls_audit_insert ON public.calls;
CREATE TRIGGER calls_audit_insert
AFTER INSERT ON public.calls
FOR EACH ROW
EXECUTE FUNCTION private.audit_call_insert();

CREATE OR REPLACE FUNCTION private.audit_call_order_insert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NEW.order_source = 'previous_call' THEN
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
      NEW.workspace_id,
      COALESCE(NEW.agent_id::TEXT, 'system'),
      COALESCE((SELECT profile.full_name FROM public.profiles AS profile WHERE profile.id = NEW.agent_id), 'Unknown operator'),
      'ORDER_CREATED_FROM_CALL',
      'Order',
      format('Order %s created from a completed call for lead %s', NEW.id, NEW.lead_id),
      'low',
      'server'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_call_audit_insert ON public.orders;
CREATE TRIGGER orders_call_audit_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.audit_call_order_insert();

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
  ELSIF NEW.product_id IS DISTINCT FROM OLD.product_id
    AND upper(NEW.currency) <> product_currency
  THEN
    RAISE EXCEPTION 'Order product currency cannot change after creation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_currency_from_product ON public.orders;
CREATE TRIGGER orders_sync_currency_from_product
BEFORE INSERT OR UPDATE OF product_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.sync_order_currency_from_product();

CREATE OR REPLACE FUNCTION private.enforce_order_item_currency_match()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  order_currency TEXT;
  order_workspace_id UUID;
BEGIN
  SELECT order_row.workspace_id, upper(order_row.currency)
  INTO order_workspace_id, order_currency
  FROM public.orders AS order_row
  WHERE order_row.id = NEW.order_id;

  IF order_workspace_id IS NULL OR order_workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Order item must belong to the same workspace as its order';
  END IF;

  IF upper(NEW.currency) <> order_currency THEN
    RAISE EXCEPTION 'All order items must use the order currency';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_enforce_currency ON public.order_items;
CREATE TRIGGER order_items_enforce_currency
BEFORE INSERT OR UPDATE OF order_id, workspace_id, currency ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION private.enforce_order_item_currency_match();

REVOKE ALL ON FUNCTION private.audit_call_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_call_order_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_order_currency_from_product() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_order_item_currency_match() FROM PUBLIC, anon, authenticated;
