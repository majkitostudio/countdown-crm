-- Store the detail needed to make failed call outcomes useful for follow-up and reporting.
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS fail_reason TEXT,
  ADD COLUMN IF NOT EXISTS operator_note TEXT;

ALTER TABLE public.calls
  DROP CONSTRAINT IF EXISTS calls_fail_reason_check;

ALTER TABLE public.calls
  ADD CONSTRAINT calls_fail_reason_check CHECK (
    fail_reason IS NULL OR fail_reason IN (
      'price',
      'distrust',
      'alternative_solution',
      'health_concern',
      'no_interest',
      'needs_time',
      'other'
    )
  );

ALTER TABLE public.calls
  DROP CONSTRAINT IF EXISTS calls_operator_note_length_check;

ALTER TABLE public.calls
  ADD CONSTRAINT calls_operator_note_length_check CHECK (
    operator_note IS NULL OR char_length(operator_note) <= 2000
  );

DROP FUNCTION IF EXISTS public.complete_lead_call_with_order_items(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items(
  target_queue_item_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB,
  callback_scheduled_at TIMESTAMPTZ,
  call_note TEXT,
  call_fail_reason TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = ''
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
  completed_call_id UUID;
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

  IF call_note IS NOT NULL AND char_length(call_note) > 2000 THEN
    RAISE EXCEPTION 'Call note must contain at most 2,000 characters';
  END IF;

  IF call_outcome = 'objection' THEN
    IF call_fail_reason IS NULL OR call_fail_reason NOT IN (
      'price', 'distrust', 'alternative_solution', 'health_concern',
      'no_interest', 'needs_time', 'other'
    ) THEN
      RAISE EXCEPTION 'Fail outcomes require a fail reason';
    END IF;
    IF call_note IS NULL OR btrim(call_note) = '' THEN
      RAISE EXCEPTION 'Fail outcomes require an operator note';
    END IF;
  ELSIF call_fail_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Fail reason is only valid for a fail outcome';
  END IF;

  SELECT queue_item.workspace_id, queue_item.lead_id
  INTO active_workspace_id, lead_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.id = target_queue_item_id
    AND queue_item.assigned_operator_id = current_user_id
    AND queue_item.state = 'awaiting_outcome';

  IF active_workspace_id IS NULL OR lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead assignment is not awaiting an outcome for this Operator';
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

  completed_call_id := NULLIF(completion ->> 'call_id', '')::UUID;
  IF completed_call_id IS NULL THEN
    RAISE EXCEPTION 'Call completion did not return a call ID';
  END IF;

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

  UPDATE public.calls
  SET operator_note = NULLIF(btrim(call_note), ''),
      fail_reason = call_fail_reason
  WHERE id = completed_call_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Call completion details could not be saved';
  END IF;

  RETURN completion;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
