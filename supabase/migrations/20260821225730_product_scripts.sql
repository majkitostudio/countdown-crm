-- Workspace-scoped, administrator-managed product scripts.
-- The content is sanitized application-side to a small allowlist of text marks.

CREATE TABLE IF NOT EXISTS public.product_scripts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL CHECK (char_length(content_html) BETWEEN 1 AND 100000),
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_scripts_workspace_product_unique UNIQUE (workspace_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_scripts_workspace_id_idx
  ON public.product_scripts(workspace_id);
CREATE INDEX IF NOT EXISTS product_scripts_product_id_idx
  ON public.product_scripts(product_id);

ALTER TABLE public.product_scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view product scripts" ON public.product_scripts;
CREATE POLICY "Workspace members can view product scripts"
  ON public.product_scripts
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Administrators can create product scripts" ON public.product_scripts;
CREATE POLICY "Administrators can create product scripts"
  ON public.product_scripts
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_admin(workspace_id)
    AND updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = product_scripts.product_id
        AND product.workspace_id = product_scripts.workspace_id
    )
  );

DROP POLICY IF EXISTS "Administrators can update product scripts" ON public.product_scripts;
CREATE POLICY "Administrators can update product scripts"
  ON public.product_scripts
  FOR UPDATE TO authenticated
  USING (private.is_workspace_admin(workspace_id))
  WITH CHECK (
    private.is_workspace_admin(workspace_id)
    AND updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = product_scripts.product_id
        AND product.workspace_id = product_scripts.workspace_id
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.product_scripts TO authenticated;
