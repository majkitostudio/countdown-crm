-- ============================================================================
-- Migration: Order Tracking Number and Carrier
-- Purpose: Support tracking code and carrier linking across order lifecycle and customer profile
-- ============================================================================

-- 1. Add tracking columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT;

-- 2. Index for quick lookup by tracking code
CREATE INDEX IF NOT EXISTS orders_workspace_tracking_idx
  ON public.orders(workspace_id, tracking_number)
  WHERE tracking_number IS NOT NULL;

-- 3. Manager RPC to set/update tracking information with history record
CREATE OR REPLACE FUNCTION public.update_order_tracking(
  p_order_id UUID,
  p_tracking_number TEXT,
  p_carrier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_actor_id UUID;
  v_actor_name TEXT;
  v_actor_role TEXT;
  v_clean_tracking TEXT;
  v_clean_carrier TEXT;
  v_audit_note TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  -- Verify workspace role (only managers can change tracking)
  SELECT member.role, COALESCE(profile.full_name, member.role)
    INTO v_actor_role, v_actor_name
  FROM public.workspace_members AS member
  LEFT JOIN public.profiles AS profile ON profile.id = member.user_id
  WHERE member.workspace_id = v_order.workspace_id
    AND member.user_id = v_actor_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Access forbidden: user is not a member of this workspace' USING ERRCODE = '42501';
  END IF;

  IF v_actor_role NOT IN ('administrator', 'team_leader') THEN
    RAISE EXCEPTION 'Only workspace managers can update tracking information' USING ERRCODE = '42501';
  END IF;

  v_clean_tracking := NULLIF(trim(p_tracking_number), '');
  v_clean_carrier := NULLIF(trim(p_carrier), '');

  UPDATE public.orders
  SET
    tracking_number = v_clean_tracking,
    carrier = v_clean_carrier,
    revision = revision + 1
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF v_clean_tracking IS NOT NULL THEN
    v_audit_note := 'Tracking updated: ' || v_clean_tracking || COALESCE(' (' || v_clean_carrier || ')', '');
  ELSE
    v_audit_note := 'Tracking removed';
  END IF;

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
    v_order.status,
    v_order.status,
    v_actor_id,
    v_actor_name,
    v_audit_note
  );

  RETURN jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'tracking_number', v_order.tracking_number,
    'carrier', v_order.carrier,
    'revision', v_order.revision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_tracking(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_tracking(UUID, TEXT, TEXT) TO authenticated, service_role;

-- 4. Update private.get_workspace_order_detail to include tracking_number and carrier
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

-- 5. Update private.list_workspace_orders to include tracking_number and carrier
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

-- 6. Update private.get_workspace_lead_activity_detail to include tracking_number and carrier
CREATE OR REPLACE FUNCTION private.get_workspace_lead_activity_detail(target_lead_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH target AS (
    SELECT lead_row.*
    FROM public.leads AS lead_row
    WHERE private.can_view_direct_workspace_lead(lead_row.workspace_id, lead_row.id)
      AND lead_row.id = target_lead_id
  )
  SELECT jsonb_build_object(
    'calls', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', call_row.id,
        'lead_id', call_row.lead_id,
        'agent_id', call_row.agent_id,
        'agent_name', agent.full_name,
        'duration_seconds', call_row.duration_seconds,
        'outcome', call_row.outcome,
        'fail_reason', call_row.fail_reason,
        'operator_note', call_row.operator_note,
        'sentiment', call_row.ai_sentiment,
        'order_value', 0,
        'transcript', call_row.transcript,
        'created_at', call_row.created_at
      ) ORDER BY call_row.created_at DESC, call_row.id DESC)
      FROM public.calls AS call_row
      LEFT JOIN public.profiles AS agent ON agent.id = call_row.agent_id
      WHERE call_row.workspace_id = target.workspace_id
        AND call_row.lead_id = target.id
    ), '[]'::jsonb),
    'orders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', order_row.id,
        'lead_id', order_row.lead_id,
        'lead_name', target.full_name,
        'product_id', order_row.product_id,
        'product_title', COALESCE(item.product_title_snapshot, product.title, 'Unknown product'),
        'agent_id', order_row.agent_id,
        'agent_name', agent.full_name,
        'total_amount', order_row.total_amount,
        'currency', order_row.currency,
        'status', order_row.status,
        'order_source', order_row.order_source,
        'source_note', order_row.source_note,
        'tracking_number', order_row.tracking_number,
        'carrier', order_row.carrier,
        'delivery_address_snapshot', order_row.delivery_address_snapshot,
        'delivered_at', order_row.delivered_at,
        'revision', order_row.revision,
        'created_at', order_row.created_at,
        'items', '[]'::jsonb,
        'status_history', '[]'::jsonb
      ) ORDER BY order_row.created_at DESC, order_row.id DESC)
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
      LEFT JOIN public.profiles AS agent ON agent.id = order_row.agent_id
      WHERE order_row.workspace_id = target.workspace_id
        AND order_row.lead_id = target.id
    ), '[]'::jsonb)
  )
  FROM target;
$$;
