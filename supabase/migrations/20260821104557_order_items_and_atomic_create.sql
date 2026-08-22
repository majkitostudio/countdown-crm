-- Introduce a durable order-item model while keeping legacy orders readable.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_currency_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_currency_check
  CHECK (currency = upper(currency) AND char_length(currency) BETWEEN 3 AND 3);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_title_snapshot TEXT NOT NULL,
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 1000),
  discount_percent NUMERIC NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  currency TEXT NOT NULL CHECK (currency = upper(currency) AND char_length(currency) BETWEEN 3 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_order_product_unique UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS order_items_workspace_id_idx ON public.order_items(workspace_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.can_write_order_items(
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

REVOKE ALL ON FUNCTION private.can_write_order_items(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_order_items(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Workspace members can view order items" ON public.order_items;
CREATE POLICY "Workspace members can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.orders AS order_row
      WHERE order_row.id = order_items.order_id
        AND order_row.workspace_id = order_items.workspace_id
    )
  );

DROP POLICY IF EXISTS "Order creators can insert order items" ON public.order_items;
CREATE POLICY "Order creators can insert order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_order_items(workspace_id, order_id));

GRANT SELECT, INSERT ON public.order_items TO authenticated;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_workspace_id UUID,
  p_lead_id UUID,
  p_items JSONB,
  p_order_source TEXT,
  p_source_note TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed'
)
RETURNS SETOF public.orders
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_item RECORD;
  v_product RECORD;
  v_order_id UUID;
  v_first_product_id UUID;
  v_item_count INTEGER := 0;
  v_currency TEXT;
  v_line_total NUMERIC;
  v_total_amount NUMERIC := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to create an order';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  IF p_order_source NOT IN ('previous_call', 'email', 'web_form', 'manual', 'other') THEN
    RAISE EXCEPTION 'Unsupported order source';
  END IF;

  IF p_status NOT IN ('completed', 'pending', 'in_progress', 'sent', 'cancelled', 'delivered', 'returned') THEN
    RAISE EXCEPTION 'Unsupported order status';
  END IF;

  IF p_source_note IS NOT NULL AND char_length(trim(p_source_note)) > 1000 THEN
    RAISE EXCEPTION 'Order source note is too long';
  END IF;

  IF NOT private.can_create_order_for_lead(p_workspace_id, p_lead_id) THEN
    RAISE EXCEPTION 'Order lead is not available in the active workspace';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(product_id UUID, quantity INTEGER, discount_percent NUMERIC)
    GROUP BY product_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Each product may appear only once in an order';
  END IF;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS item(product_id UUID, quantity INTEGER, discount_percent NUMERIC)
  LOOP
    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Order item product is required';
    END IF;
    IF v_item.quantity IS NULL OR v_item.quantity < 1 OR v_item.quantity > 1000 THEN
      RAISE EXCEPTION 'Order item quantity must be between 1 and 1000';
    END IF;
    IF coalesce(v_item.discount_percent, 0) < 0 OR coalesce(v_item.discount_percent, 0) > 100 THEN
      RAISE EXCEPTION 'Order item discount must be between 0 and 100 percent';
    END IF;

    SELECT product.id, product.title, product.price, product.currency
    INTO v_product
    FROM public.products AS product
    WHERE product.id = v_item.product_id
      AND product.workspace_id = p_workspace_id
      AND coalesce(product.in_stock, true) = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order item product is unavailable in the active workspace';
    END IF;

    IF v_currency IS NULL THEN
      v_currency := upper(coalesce(v_product.currency, 'USD'));
      v_first_product_id := v_product.id;
    ELSIF upper(coalesce(v_product.currency, 'USD')) <> v_currency THEN
      RAISE EXCEPTION 'All order items must use the same currency';
    END IF;

    v_line_total := round(v_product.price * v_item.quantity * (1 - coalesce(v_item.discount_percent, 0) / 100), 2);
    v_total_amount := v_total_amount + v_line_total;
    v_item_count := v_item_count + 1;
  END LOOP;

  INSERT INTO public.orders (
    workspace_id,
    lead_id,
    product_id,
    agent_id,
    total_amount,
    currency,
    status,
    order_source,
    source_note
  )
  VALUES (
    p_workspace_id,
    p_lead_id,
    CASE WHEN v_item_count = 1 THEN v_first_product_id ELSE NULL END,
    v_user_id,
    v_total_amount,
    v_currency,
    p_status,
    p_order_source,
    NULLIF(trim(p_source_note), '')
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS item(product_id UUID, quantity INTEGER, discount_percent NUMERIC)
  LOOP
    SELECT product.id, product.title, product.price, product.currency
    INTO v_product
    FROM public.products AS product
    WHERE product.id = v_item.product_id
      AND product.workspace_id = p_workspace_id;

    v_line_total := round(v_product.price * v_item.quantity * (1 - coalesce(v_item.discount_percent, 0) / 100), 2);

    INSERT INTO public.order_items (
      workspace_id,
      order_id,
      product_id,
      product_title_snapshot,
      unit_price,
      quantity,
      discount_percent,
      line_total,
      currency
    )
    VALUES (
      p_workspace_id,
      v_order_id,
      v_product.id,
      v_product.title,
      v_product.price,
      v_item.quantity,
      coalesce(v_item.discount_percent, 0),
      v_line_total,
      upper(coalesce(v_product.currency, 'USD'))
    );
  END LOOP;

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
    v_user_id::TEXT,
    coalesce((SELECT profile.full_name FROM public.profiles AS profile WHERE profile.id = v_user_id), 'Unknown operator'),
    'ORDER_CREATED_MANUAL',
    'Order',
    format('Order %s created from %s with %s item(s)%s', v_order_id, p_order_source, v_item_count, CASE WHEN p_source_note IS NOT NULL AND trim(p_source_note) <> '' THEN format(': %s', trim(p_source_note)) ELSE '' END),
    'low',
    'server'
  );

  RETURN QUERY
  SELECT order_row.*
  FROM public.orders AS order_row
  WHERE order_row.id = v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items(UUID, UUID, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(UUID, UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;
