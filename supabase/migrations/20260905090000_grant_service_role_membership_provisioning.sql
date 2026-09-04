-- Trusted server-side provisioning needs to create and clean up disposable
-- test memberships. Keep this grant scoped to the service role only; regular
-- clients remain governed by the existing authenticated RLS policies.

GRANT SELECT, INSERT, DELETE
ON TABLE public.workspace_members
TO service_role;
