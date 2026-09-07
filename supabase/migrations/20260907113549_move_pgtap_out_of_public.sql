-- pgTAP is a development/testing extension and must not publish its functions
-- through the exposed public Data API schema. Fresh local databases may not
-- have pgTAP installed until the test runner starts, so absence is a safe no-op.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE
  installed_schema NAME;
  is_relocatable BOOLEAN;
BEGIN
  SELECT namespace.nspname, extension.extrelocatable
  INTO installed_schema, is_relocatable
  FROM pg_extension AS extension
  JOIN pg_namespace AS namespace ON namespace.oid = extension.extnamespace
  WHERE extension.extname = 'pgtap';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF installed_schema = 'extensions' THEN
    RETURN;
  END IF;

  IF installed_schema <> 'public' THEN
    RAISE EXCEPTION 'pgtap is installed in unexpected schema %', installed_schema;
  END IF;

  IF NOT is_relocatable THEN
    RAISE EXCEPTION 'installed pgtap extension is not relocatable';
  END IF;

  ALTER EXTENSION pgtap SET SCHEMA extensions;
END;
$$;
