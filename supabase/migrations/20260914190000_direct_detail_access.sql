-- Keep list visibility team-scoped while allowing controlled direct reads of
-- records inside the authenticated user's workspace.

CREATE OR REPLACE FUNCTION private.can_list_order(
  target_workspace_id UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS order_row
    WHERE order_row.id = target_order_id
      AND order_row.workspace_id = target_workspace_id
      AND (
        private.is_workspace_admin(target_workspace_id)
        OR private.can_manage_team_resource(target_workspace_id, order_row.team_id)
        OR (
          order_row.team_id IS NOT NULL
          AND private.is_team_member(order_row.team_id)
          AND EXISTS (
            SELECT 1
            FROM public.workspace_members AS member
            WHERE member.workspace_id = target_workspace_id
              AND member.user_id = (SELECT auth.uid())
              AND member.role = 'operator'
          )
        )
        OR (
          order_row.team_id IS NULL
          AND order_row.agent_id = (SELECT auth.uid())
          AND private.is_workspace_member(target_workspace_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_direct_workspace_order(
  target_workspace_id UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS order_row
    JOIN public.workspace_members AS member
      ON member.workspace_id = order_row.workspace_id
     AND member.user_id = (SELECT auth.uid())
     AND member.role IN ('operator', 'team_leader', 'administrator')
    WHERE order_row.id = target_order_id
      AND order_row.workspace_id = target_workspace_id
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_direct_workspace_call_review(
  target_workspace_id UUID,
  target_call_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calls AS call_row
    JOIN public.workspace_members AS member
      ON member.workspace_id = call_row.workspace_id
     AND member.user_id = (SELECT auth.uid())
     AND member.role IN ('operator', 'team_leader', 'administrator')
    WHERE call_row.id = target_call_id
      AND call_row.workspace_id = target_workspace_id
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_direct_workspace_lead(
  target_workspace_id UUID,
  target_lead_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads AS lead_row
    JOIN public.workspace_members AS member
      ON member.workspace_id = lead_row.workspace_id
     AND member.user_id = (SELECT auth.uid())
     AND member.role IN ('operator', 'team_leader', 'administrator')
    WHERE lead_row.id = target_lead_id
      AND lead_row.workspace_id = target_workspace_id
  );
$$;

REVOKE ALL ON FUNCTION private.can_list_order(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.can_view_direct_workspace_order(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.can_view_direct_workspace_call_review(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.can_view_direct_workspace_lead(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_list_order(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_direct_workspace_order(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_direct_workspace_call_review(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_direct_workspace_lead(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Workspace roles can view permitted orders" ON public.orders;
CREATE POLICY "Workspace roles can view permitted orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (private.can_list_order(workspace_id, id));

-- This RPC is deliberately separate from the orders SELECT policy. Calling it
-- for one known ID does not make foreign orders appear in an orders list.
CREATE OR REPLACE FUNCTION public.get_workspace_order_detail(target_order_id UUID)
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

-- The list query returns only records allowed by can_list_order and carries
-- the display names through the trusted database boundary.
CREATE OR REPLACE FUNCTION public.list_workspace_orders(target_workspace_id UUID)
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
        'lead_name', lead_row.full_name,
        'product_id', order_row.product_id,
        'product_title', product.title,
        'agent_id', order_row.agent_id,
        'agent_name', profile.full_name,
        'total_amount', order_row.total_amount,
        'currency', order_row.currency,
        'status', order_row.status,
        'order_source', order_row.order_source,
        'source_note', order_row.source_note,
        'delivery_address_snapshot', order_row.delivery_address_snapshot,
        'delivered_at', order_row.delivered_at,
        'revision', order_row.revision,
        'created_at', order_row.created_at,
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
          WHERE item.order_id = order_row.id
            AND item.workspace_id = order_row.workspace_id
        ), '[]'::jsonb),
        'status_history', '[]'::jsonb
      ) AS order_json
    FROM public.orders AS order_row
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
  ) AS visible_orders;
$$;

-- Direct review reads include all evidence in one authorized result. This is
-- intentionally read-only; recording a review keeps its manager-only checks.
CREATE OR REPLACE FUNCTION public.get_workspace_call_review_detail(target_call_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  WITH target AS (
    SELECT
      call_row.*,
      lead_row.full_name AS lead_name,
      operator_profile.full_name AS operator_name
    FROM public.calls AS call_row
    LEFT JOIN public.leads AS lead_row
      ON lead_row.id = call_row.lead_id
     AND lead_row.workspace_id = call_row.workspace_id
    LEFT JOIN public.profiles AS operator_profile
      ON operator_profile.id = call_row.agent_id
    WHERE call_row.id = target_call_id
      AND private.can_view_direct_workspace_call_review(call_row.workspace_id, call_row.id)
  )
  SELECT jsonb_build_object(
    'call', jsonb_build_object(
      'id', target.id,
      'workspace_id', target.workspace_id,
      'lead_id', target.lead_id,
      'agent_id', target.agent_id,
      'duration_seconds', target.duration_seconds,
      'outcome', target.outcome,
      'fail_reason', target.fail_reason,
      'operator_note', target.operator_note,
      'callback_scheduled_at', target.callback_scheduled_at,
      'transcript', target.transcript,
      'created_at', target.created_at
    ),
    'customer', CASE WHEN target.lead_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', target.lead_id,
      'name', target.lead_name
    ) END,
    'operator', CASE WHEN target.agent_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', target.agent_id,
      'name', target.operator_name
    ) END,
    'session', (
      SELECT jsonb_build_object(
        'provider', session.provider,
        'script_source', session.script_source,
        'script_product_id', session.script_product_id,
        'script_product_title', session.script_product_title,
        'script_version_id', session.script_version_id,
        'script_version_number', session.script_version_number,
        'script_snapshot_html', session.script_snapshot_html,
        'script_captured_at', session.script_captured_at
      )
      FROM public.telephony_call_sessions AS session
      WHERE session.completed_call_id = target.id
        AND session.workspace_id = target.workspace_id
      LIMIT 1
    ),
    'revisions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', revision.id,
        'call_id', revision.call_id,
        'revision_number', revision.revision_number,
        'verdict', revision.verdict,
        'coaching_note', revision.coaching_note,
        'correction_reason', revision.correction_reason,
        'reviewer_id', revision.reviewer_id,
        'reviewer_name', reviewer.full_name,
        'supersedes_revision_id', revision.supersedes_revision_id,
        'created_at', revision.created_at
      ) ORDER BY revision.revision_number ASC)
      FROM public.call_review_revisions AS revision
      LEFT JOIN public.profiles AS reviewer
        ON reviewer.id = revision.reviewer_id
      WHERE revision.call_id = target.id
        AND revision.workspace_id = target.workspace_id
    ), '[]'::jsonb)
  )
  FROM target;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_lead_detail(target_lead_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', lead_row.id,
    'workspace_id', lead_row.workspace_id,
    'full_name', lead_row.full_name,
    'phone', lead_row.phone,
    'email', lead_row.email,
    'city', lead_row.city,
    'company', lead_row.company,
    'country', lead_row.country,
    'status', lead_row.status,
    'ai_score', lead_row.ai_score,
    'notes', lead_row.notes,
    'created_at', lead_row.created_at,
    'updated_at', lead_row.updated_at
  )
  FROM public.leads AS lead_row
  WHERE private.can_view_direct_workspace_lead(lead_row.workspace_id, lead_row.id)
    AND lead_row.id = target_lead_id;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_lead_activity_detail(target_lead_id UUID)
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

REVOKE ALL ON FUNCTION public.get_workspace_order_detail(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_workspace_orders(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_call_review_detail(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_lead_detail(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_lead_activity_detail(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_order_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_workspace_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_call_review_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_lead_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_lead_activity_detail(UUID) TO authenticated;
