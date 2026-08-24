-- Close the operator checkout gap without changing the existing completion
-- contracts. The wrappers reuse the already authorized atomic call completion
-- functions, then add the durable order-item rows in the same transaction.

CREATE OR REPLACE FUNCTION public.complete_call_with_order_items(
  p_lead_id UUID,
  p_duration_seconds INTEGER,
  p_outcome TEXT,
  p_transcript TEXT,
  p_ai_sentiment TEXT,
  p_order_items JSONB DEFAULT NULL
)
RETURNS TABLE (
  call_id UUID,
  order_id UUID,
  lead_status TEXT
)
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  workspace_id UUID;
  item RECORD;
  product public.products%ROWTYPE;
  first_product_id UUID;
  order_id_value UUID;
  total_amount NUMERIC := 0;
  item_count INTEGER := 0;
  has_order BOOLEAN := false;
  completion RECORD;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_order_items IS NOT NULL AND jsonb_typeof(p_order_items) <> 'array' THEN
    RAISE EXCEPTION 'Order items must be a JSON array';
  END IF;

  has_order := p_order_items IS NOT NULL AND jsonb_array_length(p_order_items) > 0;
  IF has_order AND p_outcome <> 'order_placed' THEN
    RAISE EXCEPTION 'Order items require an order_placed outcome';
  END IF;
  IF p_outcome = 'order_placed' AND NOT has_order THEN
    RAISE EXCEPTION 'An order_placed call requires at least one order item';
  END IF;

  SELECT lead.workspace_id
  INTO workspace_id
  FROM public.leads AS lead
  WHERE lead.id = p_lead_id;

  IF workspace_id IS NULL OR NOT private.is_workspace_member(workspace_id) THEN
    RAISE EXCEPTION 'Lead does not belong to the active workspace';
  END IF;

  IF has_order THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
      GROUP BY product_id
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'Each product may appear only once in an order';
    END IF;

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(p_order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
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

      SELECT product.id, product.title, product.price, product.currency
      INTO product
      FROM public.products AS product
      WHERE product.id = item.product_id
        AND product.workspace_id = workspace_id
        AND coalesce(product.in_stock, true) = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item product is unavailable in the active workspace';
      END IF;

      IF first_product_id IS NULL THEN
        first_product_id := product.id;
      END IF;
      total_amount := total_amount + round(item.unit_price, 2) * item.quantity;
      item_count := item_count + 1;
    END LOOP;
  END IF;

  SELECT *
  INTO completion
  FROM public.complete_call_with_order(
    p_lead_id,
    p_duration_seconds,
    p_outcome,
    p_transcript,
    p_ai_sentiment,
    first_product_id,
    CASE WHEN has_order THEN round(total_amount, 2) ELSE NULL END
  );

  call_id := completion.call_id;
  order_id := completion.order_id;
  lead_status := completion.lead_status;

  IF has_order THEN
    IF order_id IS NULL THEN
      RAISE EXCEPTION 'Call completion did not return the created order';
    END IF;

    -- The legacy order-item sync trigger expects this flag for trusted,
    -- server-side atomic writes. All item and product checks were performed
    -- above before enabling the trigger guard.
    PERFORM set_config('countdown.order_edit_rpc', 'on', true);

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(p_order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
      SELECT product.id, product.title, product.price, product.currency
      INTO product
      FROM public.products AS product
      WHERE product.id = item.product_id
        AND product.workspace_id = workspace_id;

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
        workspace_id,
        order_id,
        product.id,
        product.title,
        round(item.unit_price, 2),
        round(product.price, 2),
        item.quantity,
        round(round(item.unit_price, 2) * item.quantity, 2),
        upper(coalesce(product.currency, 'USD'))
      );
    END LOOP;
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_call_with_order_items(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order_items(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items(
  target_queue_item_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  workspace_id UUID;
  lead_id UUID;
  item RECORD;
  product public.products%ROWTYPE;
  first_product_id UUID;
  total_amount NUMERIC := 0;
  has_order BOOLEAN := false;
  completion JSONB;
  created_order_id UUID;
BEGIN
  IF order_items IS NOT NULL AND jsonb_typeof(order_items) <> 'array' THEN
    RAISE EXCEPTION 'Order items must be a JSON array';
  END IF;

  has_order := order_items IS NOT NULL AND jsonb_array_length(order_items) > 0;
  IF has_order AND call_outcome <> 'order_placed' THEN
    RAISE EXCEPTION 'Order items require an order_placed outcome';
  END IF;
  IF call_outcome = 'order_placed' AND NOT has_order THEN
    RAISE EXCEPTION 'An order_placed call requires at least one order item';
  END IF;

  SELECT queue_item.workspace_id, queue_item.lead_id
  INTO workspace_id, lead_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.id = target_queue_item_id
    AND queue_item.assigned_operator_id = current_user_id
    AND queue_item.state = 'in_progress';

  IF workspace_id IS NULL OR lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead assignment is not active for this Operator';
  END IF;

  IF has_order THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
      GROUP BY product_id
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'Each product may appear only once in an order';
    END IF;

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
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

      SELECT product.id, product.title, product.price, product.currency
      INTO product
      FROM public.products AS product
      WHERE product.id = item.product_id
        AND product.workspace_id = workspace_id
        AND coalesce(product.in_stock, true) = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item product is unavailable in the active workspace';
      END IF;

      IF first_product_id IS NULL THEN
        first_product_id := product.id;
      END IF;
      total_amount := total_amount + round(item.unit_price, 2) * item.quantity;
    END LOOP;
  END IF;

  completion := private.complete_lead_call_impl(
    target_queue_item_id,
    call_duration_seconds,
    call_outcome,
    call_transcript,
    call_ai_sentiment,
    first_product_id,
    CASE WHEN has_order THEN round(total_amount, 2) ELSE NULL END,
    callback_scheduled_at
  );

  created_order_id := NULLIF(completion ->> 'order_id', '')::UUID;
  IF has_order THEN
    IF created_order_id IS NULL THEN
      RAISE EXCEPTION 'Call completion did not return the created order';
    END IF;

    PERFORM set_config('countdown.order_edit_rpc', 'on', true);

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
      SELECT product.id, product.title, product.price, product.currency
      INTO product
      FROM public.products AS product
      WHERE product.id = item.product_id
        AND product.workspace_id = workspace_id;

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
        workspace_id,
        created_order_id,
        product.id,
        product.title,
        round(item.unit_price, 2),
        round(product.price, 2),
        item.quantity,
        round(round(item.unit_price, 2) * item.quantity, 2),
        upper(coalesce(product.currency, 'USD'))
      );
    END LOOP;
  END IF;

  RETURN completion;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ)
  TO authenticated;
