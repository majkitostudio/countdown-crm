-- Preserve authorization while removing overlapping SELECT/ALL policies.

DROP POLICY IF EXISTS "Workspace managers can manage products" ON public.products;
DROP POLICY IF EXISTS "Team Leaders and Administrators can manage products" ON public.products;
CREATE POLICY "Team Leaders and Administrators can insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));
CREATE POLICY "Team Leaders and Administrators can update products" ON public.products FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id)) WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));
CREATE POLICY "Team Leaders and Administrators can delete products" ON public.products FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can manage objections" ON public.objections;
DROP POLICY IF EXISTS "Team Leaders and Administrators can manage objections" ON public.objections;
CREATE POLICY "Team Leaders and Administrators can insert objections" ON public.objections FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id) AND (product_id IS NULL OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = objections.product_id AND p.workspace_id = objections.workspace_id)));
CREATE POLICY "Team Leaders and Administrators can update objections" ON public.objections FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id) AND (product_id IS NULL OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = objections.product_id AND p.workspace_id = objections.workspace_id)))
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id) AND (product_id IS NULL OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = objections.product_id AND p.workspace_id = objections.workspace_id)));
CREATE POLICY "Team Leaders and Administrators can delete objections" ON public.objections FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id) AND (product_id IS NULL OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = objections.product_id AND p.workspace_id = objections.workspace_id)));

DROP POLICY IF EXISTS "Workspace members can manage record entities" ON public.record_entities;
CREATE POLICY "Workspace members can insert record entities" ON public.record_entities FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.custom_objects o WHERE o.slug = record_entities.object_slug AND o.workspace_id = record_entities.workspace_id));
CREATE POLICY "Workspace members can update record entities" ON public.record_entities FOR UPDATE TO authenticated
  USING (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.custom_objects o WHERE o.slug = record_entities.object_slug AND o.workspace_id = record_entities.workspace_id))
  WITH CHECK (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.custom_objects o WHERE o.slug = record_entities.object_slug AND o.workspace_id = record_entities.workspace_id));
CREATE POLICY "Workspace members can delete record entities" ON public.record_entities FOR DELETE TO authenticated
  USING (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.custom_objects o WHERE o.slug = record_entities.object_slug AND o.workspace_id = record_entities.workspace_id));

DROP POLICY IF EXISTS "Workspace members can manage record values" ON public.record_values;
CREATE POLICY "Workspace members can insert record values" ON public.record_values FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.record_entities e WHERE e.id = record_values.record_id AND e.workspace_id = record_values.workspace_id));
CREATE POLICY "Workspace members can update record values" ON public.record_values FOR UPDATE TO authenticated
  USING (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.record_entities e WHERE e.id = record_values.record_id AND e.workspace_id = record_values.workspace_id))
  WITH CHECK (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.record_entities e WHERE e.id = record_values.record_id AND e.workspace_id = record_values.workspace_id));
CREATE POLICY "Workspace members can delete record values" ON public.record_values FOR DELETE TO authenticated
  USING (private.is_workspace_member(workspace_id) AND EXISTS (
    SELECT 1 FROM public.record_entities e WHERE e.id = record_values.record_id AND e.workspace_id = record_values.workspace_id));

DROP POLICY IF EXISTS "Workspace managers can manage workflows" ON public.workflows;
DROP POLICY IF EXISTS "Team Leaders and Administrators can manage workflows" ON public.workflows;
CREATE POLICY "Team Leaders and Administrators can insert workflows" ON public.workflows FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));
CREATE POLICY "Team Leaders and Administrators can update workflows" ON public.workflows FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id)) WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));
CREATE POLICY "Team Leaders and Administrators can delete workflows" ON public.workflows FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Users can manage own gamification" ON public.user_gamification;
CREATE POLICY "Users can insert own gamification" ON public.user_gamification FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own gamification" ON public.user_gamification FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own gamification" ON public.user_gamification FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
