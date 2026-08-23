-- Preserve the distinction between an editable draft and a historical version
-- that was previously published.

ALTER TABLE public.product_script_versions
  DROP CONSTRAINT IF EXISTS product_script_versions_status_check;

ALTER TABLE public.product_script_versions
  ADD CONSTRAINT product_script_versions_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

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
  SET status = 'archived'
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
