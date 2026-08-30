CREATE OR REPLACE FUNCTION private.heartbeat_operator_presence_impl(
  target_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  current_presence RECORD;
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can heartbeat presence';
  END IF;

  UPDATE public.operator_presence
  SET last_heartbeat_at = NOW(),
      updated_at = NOW()
  WHERE workspace_id = target_workspace_id
    AND operator_id = current_user_id
    AND state <> 'offline';

  SELECT state, last_heartbeat_at
  INTO current_presence
  FROM public.operator_presence
  WHERE workspace_id = target_workspace_id
    AND operator_id = current_user_id;

  IF current_presence.state IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'workspace_id', target_workspace_id,
    'operator_id', current_user_id,
    'state', current_presence.state,
    'last_heartbeat_at', current_presence.last_heartbeat_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_operator_presence(
  target_workspace_id UUID
)
RETURNS JSONB
LANGUAGE SQL
SET search_path = public, private, pg_temp
AS $$
  SELECT private.heartbeat_operator_presence_impl(target_workspace_id);
$$;

REVOKE ALL ON FUNCTION public.heartbeat_operator_presence(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.heartbeat_operator_presence(UUID) TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION private.heartbeat_operator_presence_impl(UUID) TO postgres;
