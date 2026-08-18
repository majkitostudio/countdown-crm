-- Remove the overlapping manager/admin ALL policies from the schema metadata
-- tables. Workspace membership is sufficient for SELECT; manager/admin roles
-- are required only for schema mutations.

DROP POLICY IF EXISTS "Workspace managers can manage custom objects"
  ON public.custom_objects;
DROP POLICY IF EXISTS "Workspace managers can insert custom objects"
  ON public.custom_objects;
DROP POLICY IF EXISTS "Workspace managers can update custom objects"
  ON public.custom_objects;
DROP POLICY IF EXISTS "Workspace managers can delete custom objects"
  ON public.custom_objects;

CREATE POLICY "Workspace managers can insert custom objects"
  ON public.custom_objects
  FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can update custom objects"
  ON public.custom_objects
  FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can delete custom objects"
  ON public.custom_objects
  FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can manage attribute definitions"
  ON public.attribute_definitions;
DROP POLICY IF EXISTS "Workspace managers can insert attribute definitions"
  ON public.attribute_definitions;
DROP POLICY IF EXISTS "Workspace managers can update attribute definitions"
  ON public.attribute_definitions;
DROP POLICY IF EXISTS "Workspace managers can delete attribute definitions"
  ON public.attribute_definitions;

CREATE POLICY "Workspace managers can insert attribute definitions"
  ON public.attribute_definitions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.custom_objects AS object
      WHERE object.slug = attribute_definitions.object_slug
        AND object.workspace_id = attribute_definitions.workspace_id
    )
  );

CREATE POLICY "Workspace managers can update attribute definitions"
  ON public.attribute_definitions
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.custom_objects AS object
      WHERE object.slug = attribute_definitions.object_slug
        AND object.workspace_id = attribute_definitions.workspace_id
    )
  )
  WITH CHECK (
    private.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.custom_objects AS object
      WHERE object.slug = attribute_definitions.object_slug
        AND object.workspace_id = attribute_definitions.workspace_id
    )
  );

CREATE POLICY "Workspace managers can delete attribute definitions"
  ON public.attribute_definitions
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.custom_objects AS object
      WHERE object.slug = attribute_definitions.object_slug
        AND object.workspace_id = attribute_definitions.workspace_id
    )
  );
