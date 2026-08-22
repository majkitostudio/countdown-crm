-- Versioned, workspace-scoped product scripts.
-- The current product_scripts row remains the published read projection used by operators.

CREATE TABLE IF NOT EXISTS public.product_script_versions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  content_html TEXT NOT NULL CHECK (char_length(content_html) BETWEEN 1 AND 100000),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT product_script_versions_workspace_product_version_unique
    UNIQUE (workspace_id, product_id, version_number)
);

CREATE INDEX IF NOT EXISTS product_script_versions_workspace_product_idx
  ON public.product_script_versions(workspace_id, product_id, version_number DESC);

CREATE UNIQUE INDEX IF NOT EXISTS product_script_versions_one_published_idx
  ON public.product_script_versions(workspace_id, product_id)
  WHERE status = 'published';

ALTER TABLE public.product_script_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view product script versions"
  ON public.product_script_versions;
CREATE POLICY "Workspace members can view product script versions"
  ON public.product_script_versions
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Administrators can create product script versions"
  ON public.product_script_versions;
CREATE POLICY "Administrators can create product script versions"
  ON public.product_script_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_admin(workspace_id)
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = product_script_versions.product_id
        AND product.workspace_id = product_script_versions.workspace_id
    )
  );

DROP POLICY IF EXISTS "Administrators can update product script versions"
  ON public.product_script_versions;
CREATE POLICY "Administrators can update product script versions"
  ON public.product_script_versions
  FOR UPDATE TO authenticated
  USING (private.is_workspace_admin(workspace_id))
  WITH CHECK (
    private.is_workspace_admin(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = product_script_versions.product_id
        AND product.workspace_id = product_script_versions.workspace_id
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.product_script_versions TO authenticated;

-- Existing one-row scripts become the first published version without changing the
-- operator-facing projection. This is idempotent for environments with no scripts yet.
INSERT INTO public.product_script_versions (
  workspace_id,
  product_id,
  version_number,
  status,
  content_html,
  created_by,
  published_by,
  created_at,
  published_at
)
SELECT
  script.workspace_id,
  script.product_id,
  1,
  'published',
  script.content_html,
  script.updated_by,
  script.updated_by,
  script.created_at,
  script.updated_at
FROM public.product_scripts AS script
ON CONFLICT (workspace_id, product_id, version_number) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_product_script_draft(
  p_workspace_id UUID,
  p_product_id UUID,
  p_content_html TEXT
)
RETURNS SETOF public.product_script_versions
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  next_version INTEGER;
  remaining_markup TEXT;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT private.is_workspace_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = p_product_id
      AND product.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'Product does not belong to the workspace';
  END IF;

  IF p_content_html IS NULL OR char_length(p_content_html) NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'Script content is outside the allowed length';
  END IF;

  remaining_markup := regexp_replace(
    p_content_html,
    '<\s*/?\s*(p|br|strong|b|em|i|mark|ul|ol|li|hr)\s*/?\s*>',
    '',
    'gi'
  );
  IF remaining_markup ~ '<[^>]*>'
     OR p_content_html ~* '\son[a-z0-9_-]+\s*='
     OR p_content_html ~* '<[^>]*\s+[a-z0-9_-]+\s*=' THEN
    RAISE EXCEPTION 'Script contains unsupported markup';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(format('%s:%s', p_workspace_id, p_product_id), 0)
  );

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
  FROM public.product_script_versions
  WHERE workspace_id = p_workspace_id
    AND product_id = p_product_id;

  RETURN QUERY
  INSERT INTO public.product_script_versions (
    workspace_id,
    product_id,
    version_number,
    status,
    content_html,
    created_by
  )
  VALUES (
    p_workspace_id,
    p_product_id,
    next_version,
    'draft',
    p_content_html,
    (SELECT auth.uid())
  )
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_product_script_version(
  p_version_id UUID
)
RETURNS SETOF public.product_script_versions
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  target public.product_script_versions;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT *
    INTO target
  FROM public.product_script_versions AS version
  WHERE version.id = p_version_id
  FOR UPDATE;

  IF NOT FOUND OR NOT private.is_workspace_admin(target.workspace_id) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(format('%s:%s', target.workspace_id, target.product_id), 0)
  );

  UPDATE public.product_script_versions
  SET status = 'draft'
  WHERE workspace_id = target.workspace_id
    AND product_id = target.product_id
    AND status = 'published'
    AND id <> target.id;

  UPDATE public.product_script_versions
  SET status = 'published',
      published_by = (SELECT auth.uid()),
      published_at = now()
  WHERE id = target.id;

  INSERT INTO public.product_scripts (
    workspace_id,
    product_id,
    content_html,
    updated_by,
    updated_at
  )
  VALUES (
    target.workspace_id,
    target.product_id,
    target.content_html,
    (SELECT auth.uid()),
    now()
  )
  ON CONFLICT (workspace_id, product_id) DO UPDATE
  SET content_html = EXCLUDED.content_html,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

  RETURN QUERY
  SELECT *
  FROM public.product_script_versions
  WHERE id = target.id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_product_script_draft(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_product_script_draft(UUID, UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.publish_product_script_version(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_product_script_version(UUID) TO authenticated;
