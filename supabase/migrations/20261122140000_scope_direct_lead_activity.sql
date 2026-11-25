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
        'order_value', NULL,
        'transcript', call_row.transcript,
        'created_at', call_row.created_at
      ) ORDER BY call_row.created_at DESC, call_row.id DESC)
      FROM public.calls AS call_row
      LEFT JOIN public.profiles AS agent ON agent.id = call_row.agent_id
      WHERE call_row.workspace_id = target.workspace_id
        AND call_row.lead_id = target.id
        AND private.can_view_direct_workspace_call_review(call_row.workspace_id, call_row.id)
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
        AND private.can_view_direct_workspace_order(order_row.workspace_id, order_row.id)
    ), '[]'::jsonb)
  )
  FROM target;
$$;
