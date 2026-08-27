-- Countdown CRM: keep SECURITY DEFINER authorization helpers outside the
-- exposed public Data API schema. RLS policies retain their function OIDs.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.is_workspace_member(UUID) SET SCHEMA private;
ALTER FUNCTION public.is_workspace_admin(UUID) SET SCHEMA private;
ALTER FUNCTION public.is_workspace_manager_or_admin(UUID) SET SCHEMA private;
ALTER FUNCTION public.prevent_workspace_change() SET SCHEMA private;

GRANT EXECUTE ON FUNCTION private.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_workspace_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_workspace_manager_or_admin(UUID) TO authenticated;
REVOKE ALL ON FUNCTION private.prevent_workspace_change() FROM PUBLIC, anon, authenticated;
