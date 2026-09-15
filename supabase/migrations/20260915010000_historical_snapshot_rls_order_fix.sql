-- Allow ordinary call and order inserts to pass RLS before the historical
-- snapshot trigger copies the lead's team onto the new row.
-- The trigger still writes the final team_id; this helper only permits a NULL
-- incoming value when the lead has a known team in the same workspace.

CREATE OR REPLACE FUNCTION private.historical_team_insert_matches_lead(
  target_workspace_id UUID,
  target_lead_id UUID,
  target_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads AS lead
    WHERE lead.id = target_lead_id
      AND lead.workspace_id = target_workspace_id
      AND (
        target_team_id IS NOT DISTINCT FROM lead.team_id
        OR (target_team_id IS NULL AND lead.team_id IS NOT NULL)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.historical_team_insert_matches_lead(UUID, UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.historical_team_insert_matches_lead(UUID, UUID, UUID)
  TO authenticated;

DROP POLICY IF EXISTS "Workspace members can create calls" ON public.calls;
CREATE POLICY "Workspace members can create calls"
  ON public.calls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND private.is_workspace_member(workspace_id)
    AND (
      (lead_id IS NULL AND team_id IS NULL)
      OR private.historical_team_insert_matches_lead(workspace_id, lead_id, team_id)
    )
  );

DROP POLICY IF EXISTS "Workspace members can create orders" ON public.orders;
CREATE POLICY "Workspace members can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND private.can_create_order_for_lead(workspace_id, lead_id)
    AND (
      (lead_id IS NULL AND team_id IS NULL)
      OR private.historical_team_insert_matches_lead(workspace_id, lead_id, team_id)
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.products AS product
        WHERE product.id = orders.product_id
          AND product.workspace_id = orders.workspace_id
      )
    )
  );
