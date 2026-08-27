-- Countdown CRM: replace broad authenticated-only business policies.
-- This migration assumes 20260809_0002 has backfilled workspace_id.

-- Preserve access for existing profile records during the transition. New
-- users must be provisioned explicitly by onboarding/admin flow.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT
  workspace.id,
  profile.id,
  CASE
    WHEN profile.role IN ('admin', 'manager', 'agent') THEN profile.role
    ELSE 'agent'
  END
FROM public.profiles AS profile
CROSS JOIN LATERAL (
  SELECT id
  FROM public.workspaces
  WHERE slug = 'main'
  ORDER BY created_at ASC
  LIMIT 1
) AS workspace
ON CONFLICT (workspace_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_workspace_manager_or_admin(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = auth.uid()
      AND member.role IN ('manager', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_manager_or_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_manager_or_admin(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_workspace_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  IF OLD.workspace_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'workspace_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'leads', 'products', 'calls', 'orders', 'objections',
    'custom_objects', 'attribute_definitions', 'record_entities',
    'record_values', 'workflows', 'workflow_executions', 'audit_logs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', table_name || '_workspace_immutable', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OF workspace_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_change()',
      table_name || '_workspace_immutable',
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can manage leads" ON public.leads;
CREATE POLICY "Workspace members can view leads" ON public.leads
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can create leads" ON public.leads
  FOR INSERT WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can update leads" ON public.leads
  FOR UPDATE USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace managers can delete leads" ON public.leads
  FOR DELETE USING (public.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Agents can view products" ON public.products;
DROP POLICY IF EXISTS "Agents can manage products" ON public.products;
CREATE POLICY "Workspace members can view products" ON public.products
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace managers can manage products" ON public.products
  FOR ALL USING (public.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (public.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Agents can view calls" ON public.calls;
DROP POLICY IF EXISTS "Agents can insert calls" ON public.calls;
CREATE POLICY "Workspace members can view calls" ON public.calls
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can create calls" ON public.calls
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id)
    AND (lead_id IS NULL OR EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = calls.lead_id AND lead.workspace_id = calls.workspace_id
    ))
  );
CREATE POLICY "Workspace members can update calls" ON public.calls
  FOR UPDATE USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Agents can view orders" ON public.orders;
DROP POLICY IF EXISTS "Agents can insert orders" ON public.orders;
CREATE POLICY "Workspace members can view orders" ON public.orders
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can create orders" ON public.orders
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id)
    AND (lead_id IS NULL OR EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = orders.lead_id AND lead.workspace_id = orders.workspace_id
    ))
    AND (product_id IS NULL OR EXISTS (
      SELECT 1 FROM public.products AS product
      WHERE product.id = orders.product_id AND product.workspace_id = orders.workspace_id
    ))
  );
CREATE POLICY "Workspace managers can update orders" ON public.orders
  FOR UPDATE USING (public.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (public.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Agents can view objections" ON public.objections;
DROP POLICY IF EXISTS "Managers can manage objections" ON public.objections;
CREATE POLICY "Workspace members can view objections" ON public.objections
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace managers can manage objections" ON public.objections
  FOR ALL USING (
    public.is_workspace_manager_or_admin(workspace_id)
    AND (product_id IS NULL OR EXISTS (
      SELECT 1 FROM public.products AS product
      WHERE product.id = objections.product_id AND product.workspace_id = objections.workspace_id
    ))
  )
  WITH CHECK (
    public.is_workspace_manager_or_admin(workspace_id)
    AND (product_id IS NULL OR EXISTS (
      SELECT 1 FROM public.products AS product
      WHERE product.id = objections.product_id AND product.workspace_id = objections.workspace_id
    ))
  );

DROP POLICY IF EXISTS "Authenticated users can view custom_objects" ON public.custom_objects;
DROP POLICY IF EXISTS "Admins can manage custom_objects" ON public.custom_objects;
CREATE POLICY "Workspace members can view custom objects" ON public.custom_objects
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace managers can manage custom objects" ON public.custom_objects
  FOR ALL USING (public.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (public.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Authenticated users can view attribute_definitions" ON public.attribute_definitions;
DROP POLICY IF EXISTS "Admins can manage attribute_definitions" ON public.attribute_definitions;
CREATE POLICY "Workspace members can view attribute definitions" ON public.attribute_definitions
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace managers can manage attribute definitions" ON public.attribute_definitions
  FOR ALL USING (
    public.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_objects AS object
      WHERE object.slug = attribute_definitions.object_slug
        AND object.workspace_id = attribute_definitions.workspace_id
    )
  )
  WITH CHECK (
    public.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_objects AS object
      WHERE object.slug = attribute_definitions.object_slug
        AND object.workspace_id = attribute_definitions.workspace_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view record_entities" ON public.record_entities;
DROP POLICY IF EXISTS "Agents can manage record_entities" ON public.record_entities;
CREATE POLICY "Workspace members can view record entities" ON public.record_entities
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can manage record entities" ON public.record_entities
  FOR ALL USING (
    public.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_objects AS object
      WHERE object.slug = record_entities.object_slug
        AND object.workspace_id = record_entities.workspace_id
    )
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_objects AS object
      WHERE object.slug = record_entities.object_slug
        AND object.workspace_id = record_entities.workspace_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view record_values" ON public.record_values;
DROP POLICY IF EXISTS "Agents can manage record_values" ON public.record_values;
CREATE POLICY "Workspace members can view record values" ON public.record_values
  FOR SELECT USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.record_entities AS entity
      WHERE entity.id = record_values.record_id AND entity.workspace_id = record_values.workspace_id
    )
  );
CREATE POLICY "Workspace members can manage record values" ON public.record_values
  FOR ALL USING (
    public.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.record_entities AS entity
      WHERE entity.id = record_values.record_id AND entity.workspace_id = record_values.workspace_id
    )
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.record_entities AS entity
      WHERE entity.id = record_values.record_id AND entity.workspace_id = record_values.workspace_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "Managers can manage workflows" ON public.workflows;
CREATE POLICY "Workspace members can view workflows" ON public.workflows
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace managers can manage workflows" ON public.workflows
  FOR ALL USING (public.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (public.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Authenticated users can view workflow_executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "System can insert workflow_executions" ON public.workflow_executions;
CREATE POLICY "Workspace members can view workflow executions" ON public.workflow_executions
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can create workflow executions" ON public.workflow_executions
  FOR INSERT WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (rule_id IS NULL OR EXISTS (
      SELECT 1 FROM public.workflows AS workflow
      WHERE workflow.id = workflow_executions.rule_id AND workflow.workspace_id = workflow_executions.workspace_id
    ))
  );

DROP POLICY IF EXISTS "Authenticated users can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Workspace managers can view audit logs" ON public.audit_logs
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_manager_or_admin(workspace_id));
CREATE POLICY "Workspace members can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
