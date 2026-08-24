-- Countdown CRM: grant the authenticated API role table access; RLS remains
-- the row-level authorization boundary.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.organizations,
  public.workspaces,
  public.workspace_members,
  public.leads,
  public.products,
  public.objections,
  public.calls,
  public.orders,
  public.custom_objects,
  public.attribute_definitions,
  public.record_entities,
  public.record_values,
  public.workflows,
  public.workflow_executions,
  public.audit_logs
TO authenticated;

-- Keep the local replay aligned with the live API role boundary. Supabase's
-- local defaults otherwise leave MAINTAIN/REFERENCES/TRIGGER/TRUNCATE on the
-- application tables and grant table access to anon/service_role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'organizations', 'workspaces', 'workspace_members',
    'leads', 'products', 'objections', 'calls', 'orders',
    'custom_objects', 'attribute_definitions', 'record_entities',
    'record_values', 'workflows', 'workflow_executions',
    'audit_logs', 'user_gamification'
  ] LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, service_role',
      table_name
    );
    EXECUTE format(
      'REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE public.%I FROM authenticated',
      table_name
    );
  END LOOP;
END $$;
