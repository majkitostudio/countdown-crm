-- Countdown CRM: remove the legacy public-role surface from the clean schema.
-- Workspace predicates remain the authorization boundary; the explicit role
-- target prevents anonymous Data API callers from reaching those predicates.

ALTER POLICY "Members can view their organizations" ON public.organizations TO authenticated;
ALTER POLICY "Organization admins can update their organizations" ON public.organizations TO authenticated;

ALTER POLICY "Members can view their workspaces" ON public.workspaces TO authenticated;
ALTER POLICY "Workspace admins can update their workspaces" ON public.workspaces TO authenticated;

ALTER POLICY "Members can view workspace memberships" ON public.workspace_members TO authenticated;
ALTER POLICY "Workspace admins can manage memberships" ON public.workspace_members TO authenticated;

ALTER POLICY "Workspace members can view leads" ON public.leads TO authenticated;
ALTER POLICY "Workspace members can create leads" ON public.leads TO authenticated;
ALTER POLICY "Workspace members can update leads" ON public.leads TO authenticated;
ALTER POLICY "Workspace managers can delete leads" ON public.leads TO authenticated;

ALTER POLICY "Workspace members can view products" ON public.products TO authenticated;
ALTER POLICY "Workspace managers can manage products" ON public.products TO authenticated;

ALTER POLICY "Workspace members can view calls" ON public.calls TO authenticated;
ALTER POLICY "Workspace members can create calls" ON public.calls TO authenticated;
ALTER POLICY "Workspace members can update calls" ON public.calls TO authenticated;

ALTER POLICY "Workspace members can view orders" ON public.orders TO authenticated;
ALTER POLICY "Workspace members can create orders" ON public.orders TO authenticated;
ALTER POLICY "Workspace managers can update orders" ON public.orders TO authenticated;

ALTER POLICY "Workspace members can view objections" ON public.objections TO authenticated;
ALTER POLICY "Workspace managers can manage objections" ON public.objections TO authenticated;

ALTER POLICY "Workspace members can view custom objects" ON public.custom_objects TO authenticated;
ALTER POLICY "Workspace managers can manage custom objects" ON public.custom_objects TO authenticated;
ALTER POLICY "Workspace members can view attribute definitions" ON public.attribute_definitions TO authenticated;
ALTER POLICY "Workspace managers can manage attribute definitions" ON public.attribute_definitions TO authenticated;
ALTER POLICY "Workspace members can view record entities" ON public.record_entities TO authenticated;
ALTER POLICY "Workspace members can manage record entities" ON public.record_entities TO authenticated;
ALTER POLICY "Workspace members can view record values" ON public.record_values TO authenticated;
ALTER POLICY "Workspace members can manage record values" ON public.record_values TO authenticated;

ALTER POLICY "Workspace members can view workflows" ON public.workflows TO authenticated;
ALTER POLICY "Workspace managers can manage workflows" ON public.workflows TO authenticated;
ALTER POLICY "Workspace members can view workflow executions" ON public.workflow_executions TO authenticated;
ALTER POLICY "Workspace members can create workflow executions" ON public.workflow_executions TO authenticated;
ALTER POLICY "Workspace managers can view audit logs" ON public.audit_logs TO authenticated;
ALTER POLICY "Workspace members can create audit logs" ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view gamification" ON public.user_gamification;
DROP POLICY IF EXISTS "Users can manage own gamification" ON public.user_gamification;
CREATE POLICY "Users can view own gamification" ON public.user_gamification
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can manage own gamification" ON public.user_gamification
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
