-- Countdown CRM: keep internal authorization helpers out of the public RPC surface.
-- These functions are used by RLS and triggers, not as anonymous API endpoints.

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.is_workspace_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.is_workspace_manager_or_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_manager_or_admin(UUID) TO authenticated;

ALTER FUNCTION public.prevent_workspace_change() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.prevent_workspace_change() FROM PUBLIC, anon, authenticated;

-- This helper existed in an older database snapshot but is not part of the
-- clean bootstrap schema. Revoke it when present without making a fresh
-- installation depend on a historical function.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;
