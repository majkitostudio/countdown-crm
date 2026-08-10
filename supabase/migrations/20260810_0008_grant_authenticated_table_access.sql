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
