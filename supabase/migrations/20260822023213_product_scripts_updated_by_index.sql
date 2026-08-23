-- Keep the administrator audit foreign key indexed for script save/review queries.
CREATE INDEX IF NOT EXISTS product_scripts_updated_by_idx
  ON public.product_scripts(updated_by);
