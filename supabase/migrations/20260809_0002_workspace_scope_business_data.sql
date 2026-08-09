-- Countdown CRM: attach business data to a workspace.
--
-- This migration establishes the data boundary. It intentionally does not
-- replace the legacy authenticated-user RLS policies yet; that cutover is a
-- separate step after application queries and membership bootstrap are ready.

DO $$
DECLARE
  bootstrap_organization_id UUID;
  bootstrap_workspace_id UUID;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES ('Countdown CRM', 'countdown')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO bootstrap_organization_id;

  IF bootstrap_organization_id IS NULL THEN
    SELECT id INTO bootstrap_organization_id
    FROM public.organizations
    WHERE slug = 'countdown';
  END IF;

  INSERT INTO public.workspaces (organization_id, name, slug)
  VALUES (bootstrap_organization_id, 'Main workspace', 'main')
  ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO bootstrap_workspace_id;

  IF bootstrap_workspace_id IS NULL THEN
    SELECT id INTO bootstrap_workspace_id
    FROM public.workspaces
    WHERE organization_id = bootstrap_organization_id
      AND slug = 'main';
  END IF;

  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.objections ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.custom_objects ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.attribute_definitions ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.record_entities ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.record_values ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.workflow_executions ADD COLUMN IF NOT EXISTS workspace_id UUID;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS workspace_id UUID;

  UPDATE public.leads SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.products SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.calls SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.orders SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.objections SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.custom_objects SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.attribute_definitions SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.record_entities SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.record_values SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.workflows SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.workflow_executions SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;
  UPDATE public.audit_logs SET workspace_id = bootstrap_workspace_id WHERE workspace_id IS NULL;

  -- Keep the new columns nullable for one transition step. The existing
  -- browser services do not pass workspace_id yet; Commit 6 will make that
  -- contract mandatory before the RLS policy cutover.
END $$;

DO $$
BEGIN
  ALTER TABLE public.leads
    ADD CONSTRAINT leads_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'calls', 'orders', 'objections', 'custom_objects',
    'attribute_definitions', 'record_entities', 'record_values',
    'workflows', 'workflow_executions', 'audit_logs'
  ] LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE',
        table_name,
        table_name || '_workspace_id_fkey'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS leads_workspace_id_idx ON public.leads(workspace_id);
CREATE INDEX IF NOT EXISTS products_workspace_id_idx ON public.products(workspace_id);
CREATE INDEX IF NOT EXISTS calls_workspace_id_idx ON public.calls(workspace_id);
CREATE INDEX IF NOT EXISTS orders_workspace_id_idx ON public.orders(workspace_id);
CREATE INDEX IF NOT EXISTS objections_workspace_id_idx ON public.objections(workspace_id);
CREATE INDEX IF NOT EXISTS custom_objects_workspace_id_idx ON public.custom_objects(workspace_id);
CREATE INDEX IF NOT EXISTS attribute_definitions_workspace_id_idx ON public.attribute_definitions(workspace_id);
CREATE INDEX IF NOT EXISTS record_entities_workspace_id_idx ON public.record_entities(workspace_id);
CREATE INDEX IF NOT EXISTS record_values_workspace_id_idx ON public.record_values(workspace_id);
CREATE INDEX IF NOT EXISTS workflows_workspace_id_idx ON public.workflows(workspace_id);
CREATE INDEX IF NOT EXISTS workflow_executions_workspace_id_idx ON public.workflow_executions(workspace_id);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_id_idx ON public.audit_logs(workspace_id);
