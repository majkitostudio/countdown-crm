-- Countdown CRM: make the workspace boundary mandatory in the clean schema
-- and cover the remaining foreign keys with indexes.

ALTER TABLE public.attribute_definitions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.calls ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.custom_objects ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.objections ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.record_entities ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.record_values ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.workflow_executions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.workflows ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS calls_agent_id_idx ON public.calls(agent_id);
CREATE INDEX IF NOT EXISTS calls_lead_id_idx ON public.calls(lead_id);
CREATE INDEX IF NOT EXISTS orders_agent_id_idx ON public.orders(agent_id);
CREATE INDEX IF NOT EXISTS orders_lead_id_idx ON public.orders(lead_id);
CREATE INDEX IF NOT EXISTS orders_product_id_idx ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS objections_product_id_idx ON public.objections(product_id);
CREATE INDEX IF NOT EXISTS attribute_definitions_object_slug_idx
  ON public.attribute_definitions(object_slug);
CREATE INDEX IF NOT EXISTS record_entities_object_slug_idx
  ON public.record_entities(object_slug);
CREATE INDEX IF NOT EXISTS workflow_executions_rule_id_idx
  ON public.workflow_executions(rule_id);
