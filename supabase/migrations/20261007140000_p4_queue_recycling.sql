-- Countdown CRM: Milestone 2 — P4 Queue Recycling & Department Routing
-- Recycles eligible fail outcomes (needs_time, price, distrust, alternative_solution, other)
-- into the P4 Department with tailored cooling-off intervals.
-- Health concerns and cold rejections remain closed / unresponsive.

-- 1. Ensure P4 Department exists for every active workspace
INSERT INTO public.teams (workspace_id, name, slug, status)
SELECT ws.id, 'Oddělení P4', 'p4', 'active'
FROM public.workspaces AS ws
WHERE NOT EXISTS (
  SELECT 1 FROM public.teams AS t
  WHERE t.workspace_id = ws.id AND (t.slug = 'p4' OR lower(t.name) = 'oddělení p4')
)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- 2. Upgrade complete_lead_call_with_order_items to handle P4 fail recycling
CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items(
  target_queue_item_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  call_note TEXT DEFAULT NULL,
  call_fail_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  active_workspace_id UUID;
  current_team_id UUID;
  target_lead_id UUID;
  p4_team_id UUID;
  cooldown_interval INTERVAL;
  has_order BOOLEAN := FALSE;
  first_product_id UUID := NULL;
  total_amount NUMERIC := 0;
  item RECORD;
  product RECORD;
  completion JSONB;
  completed_call_id UUID;
  created_order_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT workspace_id, team_id, lead_id
  INTO active_workspace_id, current_team_id, target_lead_id
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id AND assigned_operator_id = current_user_id;

  IF active_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Queue item not found or not assigned to current operator';
  END IF;

  IF order_items IS NOT NULL AND jsonb_typeof(order_items) = 'array' AND jsonb_array_length(order_items) > 0 THEN
    has_order := TRUE;

    FOR item IN
      SELECT *
      FROM jsonb_to_recordset(order_items) AS order_item(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
      SELECT catalog_product.*
      INTO product
      FROM public.products AS catalog_product
      WHERE catalog_product.id = item.product_id
        AND catalog_product.workspace_id = active_workspace_id;

      IF product.id IS NULL THEN
        RAISE EXCEPTION 'Order product does not belong to the active workspace';
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

  -- P4 Recycling Logic for fail outcomes
  IF call_outcome = 'objection' AND call_fail_reason IN ('needs_time', 'price', 'distrust', 'alternative_solution', 'other') THEN
    cooldown_interval := CASE call_fail_reason
      WHEN 'needs_time' THEN INTERVAL '3 days'
      WHEN 'price' THEN INTERVAL '14 days'
      WHEN 'other' THEN INTERVAL '14 days'
      WHEN 'distrust' THEN INTERVAL '21 days'
      WHEN 'alternative_solution' THEN INTERVAL '30 days'
      ELSE INTERVAL '14 days'
    END;

    -- Look up P4 department team
    SELECT t.id INTO p4_team_id
    FROM public.teams AS t
    WHERE t.workspace_id = active_workspace_id
      AND (t.slug = 'p4' OR lower(t.name) = 'oddělení p4')
    LIMIT 1;

    -- Recycle lead queue item to P4 department
    UPDATE public.lead_queue_items
    SET state = 'available',
        team_id = COALESCE(p4_team_id, current_team_id),
        priority = -4,
        available_at = NOW() + cooldown_interval,
        scheduled_at = NULL,
        preferred_operator_id = NULL,
        assigned_operator_id = NULL,
        last_outcome = 'objection',
        released_at = NOW(),
        completed_at = NULL,
        recovery_required = FALSE,
        updated_at = NOW()
    WHERE id = target_queue_item_id;

    -- Update lead status back to contacted and assign to P4 team
    UPDATE public.leads
    SET status = 'contacted',
        team_id = COALESCE(p4_team_id, current_team_id),
        updated_at = NOW()
    WHERE id = target_lead_id;

    -- Record queue event for P4 recycling
    PERFORM private.record_queue_event(
      target_queue_item_id,
      'requeued',
      'awaiting_outcome', 'available', current_user_id, NULL, current_user_id,
      'objection', jsonb_build_object(
        'call_id', completed_call_id,
        'fail_reason', call_fail_reason,
        'p4_recycled', true,
        'available_at', (NOW() + cooldown_interval)
      )
    );

    -- Augment completion result to reflect recycled state
    completion := completion || jsonb_build_object(
      'queue_state', 'available',
      'lead_status', 'contacted',
      'p4_recycled', true,
      'available_at', (NOW() + cooldown_interval)
    );
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
