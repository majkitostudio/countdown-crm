-- Only this mutation is privileged: audit and settings must commit together.
CREATE OR REPLACE FUNCTION public.update_telephony_adapter_with_audit(
  p_workspace_id UUID,
  p_adapter TEXT
)
RETURNS public.workspace_telephony_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := auth.uid();
  actor_name TEXT;
  settings public.workspace_telephony_settings;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_workspace_id IS NULL OR NOT private.is_workspace_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'User is not authorized for the workspace';
  END IF;
  IF p_adapter IS NULL OR p_adapter NOT IN ('local_sip', 'telnyx') THEN
    RAISE EXCEPTION 'Unsupported telephony adapter';
  END IF;
  IF p_adapter = 'telnyx' THEN
    RAISE EXCEPTION 'Telnyx activation is blocked';
  END IF;

  SELECT profile.full_name INTO actor_name
  FROM public.profiles AS profile WHERE profile.id = actor_id;

  INSERT INTO public.workspace_telephony_settings AS current_settings
    (workspace_id, active_adapter, updated_by, updated_at)
  VALUES (p_workspace_id, p_adapter, actor_id, now())
  ON CONFLICT (workspace_id) DO UPDATE
    SET active_adapter = EXCLUDED.active_adapter,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
  RETURNING current_settings.* INTO settings;

  INSERT INTO public.audit_logs
    (workspace_id, actor_id, actor_name, action, target_resource, details, severity, ip_address)
  VALUES
    (p_workspace_id, actor_id::text, COALESCE(NULLIF(btrim(actor_name), ''), 'Neznámý operátor'),
     'SETTINGS_CHANGE', 'System', format('Telephony adapter changed to %s.', p_adapter),
     'medium', NULL);

  RETURN settings;
END;
$$;

REVOKE ALL ON FUNCTION public.update_telephony_adapter_with_audit(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_telephony_adapter_with_audit(UUID, TEXT) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.workspace_telephony_settings FROM authenticated;
