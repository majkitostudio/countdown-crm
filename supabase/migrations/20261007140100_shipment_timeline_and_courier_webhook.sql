-- ============================================================================
-- Migration: Shipment Timeline, Package Location & Courier Webhook Events
-- Purpose: Support package pickup location and vertical tracking timeline events
-- ============================================================================

-- 1. Add package location and tracking events to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS package_location TEXT,
  ADD COLUMN IF NOT EXISTS tracking_events JSONB DEFAULT '[]'::jsonb;

-- 2. Function to record tracking event and optionally transition status
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

  IF p_status IN ('delivered', 'returned') AND v_old_status != p_status THEN
    v_fulfillment_event := 'carrier_event_' || v_event_id;
    PERFORM set_config('countdown.fulfillment_event_id', v_fulfillment_event, true);

    UPDATE public.orders
    SET
      status = p_status,
      package_location = COALESCE(NULLIF(trim(p_location), ''), package_location),
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
      package_location = COALESCE(NULLIF(trim(p_location), ''), package_location),
      tracking_events = v_updated_events,
      revision = revision + 1
    WHERE id = p_order_id
    RETURNING * INTO v_order;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'package_location', v_order.package_location,
    'tracking_events', v_order.tracking_events,
    'revision', v_order.revision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_tracking_event(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_order_tracking_event(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

-- 3. Update private.get_workspace_order_detail with package_location and tracking_events
CREATE OR REPLACE FUNCTION private.get_workspace_order_detail(target_order_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH target AS (
    SELECT
      order_row.*,
      product.title AS product_title,
      lead_row.full_name AS lead_name,
      profile.full_name AS agent_name
    FROM public.orders AS order_row
    LEFT JOIN public.products AS product
      ON product.id = order_row.product_id
     AND product.workspace_id = order_row.workspace_id
    LEFT JOIN public.leads AS lead_row
      ON lead_row.id = order_row.lead_id
     AND lead_row.workspace_id = order_row.workspace_id
    LEFT JOIN public.profiles AS profile
      ON profile.id = order_row.agent_id
    WHERE order_row.id = target_order_id
      AND private.can_view_direct_workspace_order(order_row.workspace_id, order_row.id)
  )
  SELECT jsonb_build_object(
    'id', target.id,
    'workspace_id', target.workspace_id,
    'team_id', target.team_id,
    'lead_id', target.lead_id,
    'lead_name', target.lead_name,
    'product_id', target.product_id,
    'product_title', target.product_title,
    'agent_id', target.agent_id,
    'agent_name', target.agent_name,
    'total_amount', target.total_amount,
    'currency', target.currency,
    'status', target.status,
    'order_source', target.order_source,
    'source_note', target.source_note,
    'tracking_number', target.tracking_number,
    'carrier', target.carrier,
    'package_location', target.package_location,
    'tracking_events', COALESCE(target.tracking_events, '[]'::jsonb),
    'delivery_address_snapshot', target.delivery_address_snapshot,
    'delivered_at', target.delivered_at,
    'revision', target.revision,
    'created_at', target.created_at,
    'can_manage', private.can_access_order(target.workspace_id, target.id),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', item.id,
        'product_id', item.product_id,
        'product_title', item.product_title_snapshot,
        'unit_price', item.unit_price,
        'minimum_unit_price', item.minimum_unit_price,
        'quantity', item.quantity,
        'line_total', item.line_total,
        'currency', item.currency
      ) ORDER BY item.created_at ASC, item.id ASC)
      FROM public.order_items AS item
      WHERE item.order_id = target.id
        AND item.workspace_id = target.workspace_id
    ), '[]'::jsonb),
    'status_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', history.id,
        'from_status', history.from_status,
        'to_status', history.to_status,
        'actor_id', history.actor_id,
        'actor_name', history.actor_name,
        'note', history.note,
        'created_at', history.created_at
      ) ORDER BY history.created_at ASC, history.id ASC)
      FROM public.order_status_history AS history
      WHERE history.order_id = target.id
        AND history.workspace_id = target.workspace_id
    ), '[]'::jsonb)
  )
  FROM target;
$$;

-- 4. Update private.list_workspace_orders with package_location and tracking_events
CREATE OR REPLACE FUNCTION private.list_workspace_orders(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(order_json ORDER BY created_at DESC, id DESC), '[]'::jsonb)
  FROM (
    SELECT
      order_row.id,
      order_row.created_at,
      jsonb_build_object(
        'id', order_row.id,
        'workspace_id', order_row.workspace_id,
        'team_id', order_row.team_id,
        'lead_id', order_row.lead_id,
        'lead_name', COALESCE(lead_row.full_name, 'Unknown customer'),
        'product_id', order_row.product_id,
        'product_title', COALESCE(item.product_title_snapshot, product.title, 'Unknown product'),
        'agent_id', order_row.agent_id,
        'agent_name', COALESCE(profile.full_name, 'Unknown operator'),
        'total_amount', order_row.total_amount,
        'currency', order_row.currency,
        'status', order_row.status,
        'order_source', order_row.order_source,
        'source_note', order_row.source_note,
        'tracking_number', order_row.tracking_number,
        'carrier', order_row.carrier,
        'package_location', order_row.package_location,
        'tracking_events', COALESCE(order_row.tracking_events, '[]'::jsonb),
        'delivery_address_snapshot', order_row.delivery_address_snapshot,
        'delivered_at', order_row.delivered_at,
        'revision', order_row.revision,
        'created_at', order_row.created_at,
        'can_manage', private.can_access_order(order_row.workspace_id, order_row.id),
        'items', '[]'::jsonb,
        'status_history', '[]'::jsonb
      ) AS order_json
    FROM public.orders AS order_row
    LEFT JOIN LATERAL (
      SELECT order_item.product_title_snapshot
      FROM public.order_items AS order_item
      WHERE order_item.order_id = order_row.id
        AND order_item.workspace_id = order_row.workspace_id
      ORDER BY order_item.created_at ASC, order_item.id ASC
      LIMIT 1
    ) AS item ON TRUE
    LEFT JOIN public.products AS product
      ON product.id = order_row.product_id
     AND product.workspace_id = order_row.workspace_id
    LEFT JOIN public.leads AS lead_row
      ON lead_row.id = order_row.lead_id
     AND lead_row.workspace_id = order_row.workspace_id
    LEFT JOIN public.profiles AS profile
      ON profile.id = order_row.agent_id
    WHERE order_row.workspace_id = target_workspace_id
      AND private.can_list_order(order_row.workspace_id, order_row.id)
  ) AS ranked;
$$;
