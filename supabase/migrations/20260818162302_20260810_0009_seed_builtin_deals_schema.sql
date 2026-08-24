-- Keep the built-in Deals object available in every workspace bootstrap.
-- This is schema metadata, not demo business data.

INSERT INTO public.custom_objects (
  workspace_id, slug, singular_name, plural_name, icon, description
)
SELECT
  w.id,
  'deals',
  'Deal',
  'Deals',
  'Briefcase',
  'B2B Sales pipeline deals, contracts, and revenue stages'
FROM public.workspaces AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.custom_objects AS existing
  WHERE existing.workspace_id = w.id
    AND existing.slug = 'deals'
);

INSERT INTO public.attribute_definitions (
  workspace_id, object_slug, slug, name, data_type, options, is_ai
)
SELECT w.id, v.object_slug, v.slug, v.name, v.data_type, v.options, v.is_ai
FROM public.workspaces AS w
CROSS JOIN (
  VALUES
    ('deals', 'title', 'Deal Name', 'text', NULL::jsonb, false),
    ('deals', 'amount', 'Deal Amount ($)', 'number', NULL::jsonb, false),
    (
      'deals',
      'stage',
      'Stage',
      'select',
      '[{"label":"Discovery","value":"discovery"},{"label":"Proposal Sent","value":"proposal"},{"label":"Negotiation","value":"negotiation"},{"label":"Closed Won","value":"closed_won"},{"label":"Closed Lost","value":"closed_lost"}]'::jsonb,
      false
    ),
    ('deals', 'win_probability', 'Win Probability (%)', 'number', NULL::jsonb, false)
) AS v(object_slug, slug, name, data_type, options, is_ai)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.attribute_definitions AS existing
  WHERE existing.workspace_id = w.id
    AND existing.object_slug = v.object_slug
    AND existing.slug = v.slug
);
