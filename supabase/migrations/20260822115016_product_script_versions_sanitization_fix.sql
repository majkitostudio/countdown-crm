-- Keep the database-side draft guard aligned with the application allowlist.
-- This is intentionally an invoker function; RLS and the administrator helper
-- remain the authorization boundary.

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
