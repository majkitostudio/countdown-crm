-- Countdown CRM: Task 2.4 — Department P4 (24h Cooldown, At-Risk Pickup & Returns) & Department P3 (21-Day Post-Delivery Retention)
-- 1. Ensure Department P3 (Retention) exists for every active workspace.
-- 2. Recyclable call objections route to Department P4 with 24 hours (next day) cooldown.
-- 3. Delivered orders schedule lead in Department P3 queue exactly 3 weeks (21 days) after delivery into client hands.
-- 4. Returned orders route immediately to Department P4 for Re-ship.
-- 5. At-risk packages sitting at pickup location (> 3 days, not yet called) route to Department P4.

-- 1. Ensure Department P3 exists for every workspace
INSERT INTO public.teams (workspace_id, name, slug, status)
SELECT ws.id, 'Oddělení P3 (Retence)', 'p3', 'active'
FROM public.workspaces AS ws
WHERE NOT EXISTS (
  SELECT 1 FROM public.teams AS t
  WHERE t.workspace_id = ws.id AND (t.slug = 'p3' OR lower(t.name) LIKE '%p3%')
)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- 2. Add package tracking timestamp columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS package_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_call_completed_at TIMESTAMPTZ;

-- 3. Upgrade complete_lead_call_with_order_items to use 24h cooldown for recyclable fails and mark pickup calls
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
  cooldown_interval INTERVAL := INTERVAL '24 hours';
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

  -- Mark at-risk pickup order as called if this lead has a package at pickup location
  UPDATE public.orders
  SET pickup_call_completed_at = clock_timestamp()
  WHERE lead_id = target_lead_id
    AND workspace_id = active_workspace_id
    AND package_location IS NOT NULL
    AND pickup_call_completed_at IS NULL;

  -- P4 Recycling: all recyclable objections route to P4 on the next day (24 hours cooldown)
  IF call_outcome = 'objection' AND call_fail_reason IN ('unsuccessful_sale', 'needs_time', 'price', 'distrust', 'alternative_solution', 'other') THEN
    cooldown_interval := INTERVAL '24 hours';

    -- Look up P4 department team
    SELECT t.id INTO p4_team_id
    FROM public.teams AS t
    WHERE t.workspace_id = active_workspace_id
      AND (t.slug = 'p4' OR lower(t.name) LIKE '%p4%')
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

-- 4. Automatic Order Lifecycle Routing for Department P3 (Retention) and Department P4 (Rescue / Returns)
CREATE OR REPLACE FUNCTION public.orders_lifecycle_department_routing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  p3_team_id UUID;
  p4_team_id UUID;
  delivery_time TIMESTAMPTZ;
  q_item_id UUID;
BEGIN
  -- Look up P3 & P4 team IDs for active workspace
  SELECT id INTO p3_team_id
  FROM public.teams
  WHERE workspace_id = NEW.workspace_id AND (slug = 'p3' OR lower(name) LIKE '%p3%')
  LIMIT 1;

  SELECT id INTO p4_team_id
  FROM public.teams
  WHERE workspace_id = NEW.workspace_id AND (slug = 'p4' OR lower(name) LIKE '%p4%')
  LIMIT 1;

  -- 4.1 Delivered package -> Route to P3 Retention queue exactly 3 weeks (21 days) after delivery into client hands
  IF NEW.status = 'delivered' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'delivered') THEN
    delivery_time := COALESCE(NEW.delivered_at, clock_timestamp());
    IF p3_team_id IS NOT NULL AND NEW.lead_id IS NOT NULL THEN
      SELECT id INTO q_item_id
      FROM public.lead_queue_items
      WHERE workspace_id = NEW.workspace_id AND lead_id = NEW.lead_id;

      IF q_item_id IS NOT NULL THEN
        UPDATE public.lead_queue_items
        SET team_id = p3_team_id,
            state = 'available',
            available_at = delivery_time + INTERVAL '21 days',
            scheduled_at = NULL,
            preferred_operator_id = NULL,
            assigned_operator_id = NULL,
            priority = 1,
            last_outcome = 'retention_followup',
            released_at = clock_timestamp(),
            completed_at = NULL,
            recovery_required = FALSE,
            updated_at = clock_timestamp()
        WHERE id = q_item_id;

        UPDATE public.leads
        SET team_id = p3_team_id,
            updated_at = clock_timestamp()
        WHERE workspace_id = NEW.workspace_id AND id = NEW.lead_id;

        PERFORM private.record_queue_event(
          q_item_id,
          'requeued',
          'closed',
          'available',
          NULL, NULL, NULL,
          'retention_scheduled',
          jsonb_build_object(
            'p3_retention', true,
            'delivered_at', delivery_time,
            'available_at', delivery_time + INTERVAL '21 days'
          )
        );
      END IF;
    END IF;

  -- 4.2 Returned package -> Route immediately to P4 Department for Re-ship contact
  ELSIF NEW.status = 'returned' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'returned') THEN
    IF p4_team_id IS NOT NULL AND NEW.lead_id IS NOT NULL THEN
      SELECT id INTO q_item_id
      FROM public.lead_queue_items
      WHERE workspace_id = NEW.workspace_id AND lead_id = NEW.lead_id;

      IF q_item_id IS NOT NULL THEN
        UPDATE public.lead_queue_items
        SET team_id = p4_team_id,
            state = 'available',
            available_at = clock_timestamp(),
            scheduled_at = NULL,
            preferred_operator_id = NULL,
            assigned_operator_id = NULL,
            priority = 2,
            last_outcome = 'package_returned',
            released_at = clock_timestamp(),
            completed_at = NULL,
            recovery_required = FALSE,
            updated_at = clock_timestamp()
        WHERE id = q_item_id;

        UPDATE public.leads
        SET team_id = p4_team_id,
            updated_at = clock_timestamp()
        WHERE workspace_id = NEW.workspace_id AND id = NEW.lead_id;

        PERFORM private.record_queue_event(
          q_item_id,
          'requeued',
          'closed',
          'available',
          NULL, NULL, NULL,
          'return_rescue_scheduled',
          jsonb_build_object(
            'p4_returned', true,
            'order_id', NEW.id
          )
        );
      END IF;
    END IF;

  -- 4.3 Sent package at pickup location -> If sitting > 3 days and not yet called, route to P4 Rescue
  ELSIF NEW.status = 'sent' AND NEW.package_location IS NOT NULL THEN
    IF p4_team_id IS NOT NULL AND NEW.lead_id IS NOT NULL AND NEW.pickup_call_completed_at IS NULL THEN
      SELECT id INTO q_item_id
      FROM public.lead_queue_items
      WHERE workspace_id = NEW.workspace_id AND lead_id = NEW.lead_id;

      IF q_item_id IS NOT NULL THEN
        UPDATE public.lead_queue_items
        SET team_id = p4_team_id,
            state = 'available',
            available_at = COALESCE(NEW.package_arrived_at, clock_timestamp()) + INTERVAL '3 days',
            scheduled_at = NULL,
            preferred_operator_id = NULL,
            assigned_operator_id = NULL,
            priority = 3,
            last_outcome = 'at_risk_pickup',
            released_at = clock_timestamp(),
            completed_at = NULL,
            recovery_required = FALSE,
            updated_at = clock_timestamp()
        WHERE id = q_item_id
          AND (state IN ('available', 'closed') OR team_id = p4_team_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_lifecycle_department_routing_trg ON public.orders;
CREATE TRIGGER orders_lifecycle_department_routing_trg
  AFTER INSERT OR UPDATE OF status, package_location, package_arrived_at, pickup_call_completed_at ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_lifecycle_department_routing();

-- 5. Upgrade record_order_tracking_event to record package_arrived_at when location is received
CREATE OR REPLACE FUNCTION public.record_order_tracking_event(
  p_order_id UUID,
  p_status TEXT,
  p_title TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT clock_timestamp()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_old_status TEXT;
  v_new_event JSONB;
  v_updated_events JSONB;
  v_event_id TEXT;
  v_fulfillment_event TEXT;
  v_arrived_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_status := v_order.status;
  v_event_id := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_new_event := jsonb_build_object(
    'id', v_event_id,
    'occurred_at', to_char(COALESCE(p_occurred_at, clock_timestamp()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'status', COALESCE(NULLIF(trim(p_status), ''), v_order.status),
    'title', trim(p_title),
    'location', NULLIF(trim(p_location), ''),
    'description', NULLIF(trim(p_description), ''),
    'source', 'carrier'
  );

  v_updated_events := COALESCE(v_order.tracking_events, '[]'::jsonb) || jsonb_build_array(v_new_event);

  IF p_location IS NOT NULL AND trim(p_location) <> '' AND v_order.package_arrived_at IS NULL THEN
    v_arrived_at := COALESCE(p_occurred_at, clock_timestamp());
  ELSE
    v_arrived_at := v_order.package_arrived_at;
  END IF;

  IF p_status IN ('delivered', 'returned') AND v_old_status != p_status THEN
    v_fulfillment_event := 'carrier_event_' || v_event_id;
    PERFORM set_config('countdown.fulfillment_event_id', v_fulfillment_event, true);

    UPDATE public.orders
    SET
      status = p_status,
      package_location = COALESCE(NULLIF(trim(p_location), ''), package_location),
      package_arrived_at = v_arrived_at,
      tracking_events = v_updated_events,
      delivered_at = CASE WHEN p_status = 'delivered' THEN clock_timestamp() ELSE delivered_at END,
      returned_at = CASE WHEN p_status = 'returned' THEN clock_timestamp() ELSE returned_at END,
      fulfillment_event_id = v_fulfillment_event,
      revision = revision + 1
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    INSERT INTO public.order_status_history (
      order_id,
      workspace_id,
      from_status,
      to_status,
      actor_id,
      actor_name,
      note
    ) VALUES (
      v_order.id,
      v_order.workspace_id,
      v_old_status,
      p_status,
      auth.uid(),
      COALESCE(p_title, 'Kurýrní API / Webhook'),
      COALESCE(p_description, p_location)
    );
  ELSE
    UPDATE public.orders
    SET
      status = COALESCE(NULLIF(trim(p_status), ''), status),
      package_location = COALESCE(NULLIF(trim(p_location), ''), package_location),
      package_arrived_at = v_arrived_at,
      tracking_events = v_updated_events,
      revision = revision + 1
    WHERE id = p_order_id
    RETURNING * INTO v_order;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'package_location', v_order.package_location,
    'package_arrived_at', v_order.package_arrived_at,
    'tracking_events', v_order.tracking_events,
    'revision', v_order.revision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_tracking_event(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_order_tracking_event(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated, service_role;
