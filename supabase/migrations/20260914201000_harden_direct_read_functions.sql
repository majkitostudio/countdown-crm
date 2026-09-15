-- Keep the public RPC names stable for the server DAL, but move the
-- SECURITY DEFINER implementations out of the API-exposed schema.
-- The public wrappers are SECURITY INVOKER; authorization remains enforced
-- by the moved implementations and their existing workspace checks.

ALTER FUNCTION public.get_workspace_order_detail(UUID) SET SCHEMA private;
ALTER FUNCTION public.list_workspace_orders(UUID) SET SCHEMA private;
ALTER FUNCTION public.get_workspace_call_review_detail(UUID) SET SCHEMA private;
ALTER FUNCTION public.get_workspace_lead_detail(UUID) SET SCHEMA private;
ALTER FUNCTION public.get_workspace_lead_activity_detail(UUID) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.get_workspace_order_detail(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.list_workspace_orders(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_workspace_call_review_detail(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_workspace_lead_detail(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_workspace_lead_activity_detail(UUID)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_workspace_order_detail(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_workspace_orders(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_workspace_call_review_detail(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_workspace_lead_detail(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_workspace_lead_activity_detail(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_workspace_order_detail(target_order_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_workspace_order_detail(target_order_id);
$$;

CREATE OR REPLACE FUNCTION public.list_workspace_orders(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.list_workspace_orders(target_workspace_id);
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_call_review_detail(target_call_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_workspace_call_review_detail(target_call_id);
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_lead_detail(target_lead_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_workspace_lead_detail(target_lead_id);
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_lead_activity_detail(target_lead_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_workspace_lead_activity_detail(target_lead_id);
$$;

REVOKE ALL ON FUNCTION public.get_workspace_order_detail(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.list_workspace_orders(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.get_workspace_call_review_detail(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.get_workspace_lead_detail(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.get_workspace_lead_activity_detail(UUID)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.get_workspace_order_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_workspace_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_call_review_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_lead_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_lead_activity_detail(UUID) TO authenticated;
