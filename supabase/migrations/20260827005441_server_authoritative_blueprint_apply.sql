-- Persist the selected industry blueprint as workspace state and apply its
-- schema metadata in one authenticated, manager-only transaction.

CREATE TABLE IF NOT EXISTS public.workspace_blueprint_state (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blueprint_id TEXT NOT NULL CHECK (blueprint_id IN ('tele_sales', 'b2b_saas', 'ecommerce_cs')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspace_blueprint_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view blueprint state"
  ON public.workspace_blueprint_state;
CREATE POLICY "Workspace members can view blueprint state"
  ON public.workspace_blueprint_state
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can insert blueprint state"
  ON public.workspace_blueprint_state;
CREATE POLICY "Workspace managers can insert blueprint state"
  ON public.workspace_blueprint_state
  FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can update blueprint state"
  ON public.workspace_blueprint_state;
CREATE POLICY "Workspace managers can update blueprint state"
  ON public.workspace_blueprint_state
  FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can delete blueprint state"
  ON public.workspace_blueprint_state;
CREATE POLICY "Workspace managers can delete blueprint state"
  ON public.workspace_blueprint_state
  FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.workspace_blueprint_state TO authenticated;
REVOKE ALL ON public.workspace_blueprint_state FROM anon;

CREATE OR REPLACE FUNCTION public.apply_blueprint_for_workspace(
  p_workspace_id UUID,
  p_blueprint_id TEXT,
  p_attributes JSONB,
  p_workflows JSONB
)
RETURNS TABLE (
  blueprint_id TEXT,
  attributes_applied INTEGER,
  rules_applied INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  attribute_item JSONB;
  workflow_item JSONB;
  existing_workflow_id UUID;
  existing_attribute_workspace_id UUID;
  applied_attributes INTEGER := 0;
  applied_rules INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Insufficient workspace permissions';
  END IF;

  IF p_blueprint_id NOT IN ('tele_sales', 'b2b_saas', 'ecommerce_cs') THEN
    RAISE EXCEPTION 'Unknown blueprint';
  END IF;

  IF jsonb_typeof(p_attributes) <> 'array' OR jsonb_array_length(p_attributes) > 50
     OR jsonb_typeof(p_workflows) <> 'array' OR jsonb_array_length(p_workflows) > 50 THEN
    RAISE EXCEPTION 'Blueprint payload is invalid';
  END IF;

  -- Serialize applications per workspace and ensure the referenced object is
  -- in this workspace before touching any metadata.
  PERFORM 1 FROM public.workspaces WHERE id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  PERFORM 1
  FROM public.custom_objects
  WHERE workspace_id = p_workspace_id AND slug = 'leads'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leads schema is unavailable in this workspace';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::TEXT || ':blueprint', 0));

  FOR attribute_item IN SELECT value FROM jsonb_array_elements(p_attributes)
  LOOP
    IF jsonb_typeof(attribute_item) <> 'object'
       OR NULLIF(attribute_item->>'key', '') IS NULL
       OR NULLIF(attribute_item->>'name', '') IS NULL
       OR attribute_item->>'type' NOT IN ('text', 'number', 'select', 'multi_select', 'boolean', 'ai_generated', 'relation') THEN
      RAISE EXCEPTION 'Blueprint attribute is invalid';
    END IF;

    SELECT workspace_id INTO existing_attribute_workspace_id
    FROM public.attribute_definitions
    WHERE object_slug = 'leads' AND slug = attribute_item->>'key'
    FOR UPDATE;
    IF FOUND AND existing_attribute_workspace_id <> p_workspace_id THEN
      RAISE EXCEPTION 'Blueprint attribute belongs to another workspace';
    END IF;

    INSERT INTO public.attribute_definitions (
      workspace_id, object_slug, slug, name, data_type, options, is_ai, ai_prompt
    ) VALUES (
      p_workspace_id,
      'leads',
      attribute_item->>'key',
      attribute_item->>'name',
      attribute_item->>'type',
      attribute_item->'options',
      (attribute_item ? 'aiConfig'),
      NULLIF(attribute_item->'aiConfig'->>'promptTemplate', '')
    )
    ON CONFLICT (object_slug, slug) DO UPDATE SET
      workspace_id = EXCLUDED.workspace_id,
      name = EXCLUDED.name,
      data_type = EXCLUDED.data_type,
      options = EXCLUDED.options,
      is_ai = EXCLUDED.is_ai,
      ai_prompt = EXCLUDED.ai_prompt;
    applied_attributes := applied_attributes + 1;
  END LOOP;

  FOR workflow_item IN SELECT value FROM jsonb_array_elements(p_workflows)
  LOOP
    IF jsonb_typeof(workflow_item) <> 'object'
       OR NULLIF(workflow_item->>'name', '') IS NULL
       OR workflow_item->>'trigger' NOT IN ('on_call_ended', 'on_lead_status_changed', 'on_order_placed', 'on_lead_created')
       OR jsonb_typeof(workflow_item->'conditions') <> 'array'
       OR jsonb_typeof(workflow_item->'actions') <> 'array' THEN
      RAISE EXCEPTION 'Blueprint workflow is invalid';
    END IF;

    SELECT id INTO existing_workflow_id
    FROM public.workflows
    WHERE workspace_id = p_workspace_id AND name = workflow_item->>'name'
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF existing_workflow_id IS NULL THEN
      INSERT INTO public.workflows (
        workspace_id, name, description, trigger_event, conditions, actions, is_active
      ) VALUES (
        p_workspace_id,
        workflow_item->>'name',
        NULLIF(workflow_item->>'description', ''),
        workflow_item->>'trigger',
        workflow_item->'conditions',
        workflow_item->'actions',
        COALESCE((workflow_item->>'enabled')::BOOLEAN, TRUE)
      );
    ELSE
      UPDATE public.workflows
      SET description = NULLIF(workflow_item->>'description', ''),
          trigger_event = workflow_item->>'trigger',
          conditions = workflow_item->'conditions',
          actions = workflow_item->'actions',
          is_active = COALESCE((workflow_item->>'enabled')::BOOLEAN, TRUE),
          updated_at = NOW()
      WHERE id = existing_workflow_id;
    END IF;
    applied_rules := applied_rules + 1;
  END LOOP;

  INSERT INTO public.workspace_blueprint_state (workspace_id, blueprint_id, updated_at)
  VALUES (p_workspace_id, p_blueprint_id, NOW())
  ON CONFLICT (workspace_id) DO UPDATE SET
    blueprint_id = EXCLUDED.blueprint_id,
    updated_at = EXCLUDED.updated_at;

  RETURN QUERY SELECT p_blueprint_id, applied_attributes, applied_rules;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_blueprint_for_workspace(UUID, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_blueprint_for_workspace(UUID, TEXT, JSONB, JSONB) TO authenticated;
