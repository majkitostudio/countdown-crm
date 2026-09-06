-- Service-role maintenance is required for controlled cleanup, provisioning,
-- and disaster recovery. End-user access remains constrained by RLS.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.workspace_user_preferences
  TO service_role;
