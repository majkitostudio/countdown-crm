-- Keep the built-in Leads schema available as workspace metadata.
-- The application exposes Leads as a built-in schema, while EAV attribute
-- definitions still require a matching custom_objects foreign-key target.
-- This creates metadata only; it does not create leads or other business data.

INSERT INTO public.custom_objects (
  workspace_id,
  slug,
  singular_name,
  plural_name,
  icon,
  description
)
SELECT
  workspace.id,
  'leads',
  'Lead',
  'Leads',
  'Users',
  'Core potential customers and call targets'
FROM public.workspaces AS workspace
WHERE NOT EXISTS (
  SELECT 1
  FROM public.custom_objects AS existing
  WHERE existing.slug = 'leads'
);

