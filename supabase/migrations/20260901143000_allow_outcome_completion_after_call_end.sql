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
  active_workspace_id UUID;
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
  INTO active_workspace_id, lead_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.id = target_queue_item_id
    AND queue_item.assigned_operator_id = current_user_id
    AND queue_item.state IN ('in_progress', 'awaiting_outcome');

  IF active_workspace_id IS NULL OR lead_id IS NULL THEN
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

      SELECT catalog_product.*
      INTO product
      FROM public.products AS catalog_product
      WHERE catalog_product.id = item.product_id
        AND catalog_product.workspace_id = active_workspace_id
        AND coalesce(catalog_product.in_stock, true) = true;

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
      SELECT catalog_product.*
      INTO product
      FROM public.products AS catalog_product
      WHERE catalog_product.id = item.product_id
        AND catalog_product.workspace_id = active_workspace_id;

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
        active_workspace_id,
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
