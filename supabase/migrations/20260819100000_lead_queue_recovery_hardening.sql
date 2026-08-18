CREATE OR REPLACE FUNCTION private.release_expired_operator_assignment(
  target_workspace_id UUID,
  target_operator_id UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  expired_item RECORD;
BEGIN
  SELECT *
  INTO expired_item
  FROM public.lead_queue_items
  WHERE workspace_id = target_workspace_id
    AND assigned_operator_id = target_operator_id
    AND state IN ('assigned', 'in_progress')
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < NOW()
  FOR UPDATE;

  IF expired_item.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.lead_queue_items
  SET state = 'available',
      assigned_operator_id = NULL,
      available_at = NOW(),
      scheduled_at = NULL,
      lease_expires_at = NULL,
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = expired_item.id;

  UPDATE public.operator_presence
  SET state = 'available',
      last_heartbeat_at = NOW(),
      updated_at = NOW()
  WHERE workspace_id = target_workspace_id
    AND operator_id = target_operator_id
    AND state IN ('in_call', 'after_call');

  PERFORM private.record_queue_event(
    expired_item.id,
    'lease_expired',
    expired_item.state,
    'available',
    expired_item.assigned_operator_id,
    NULL,
    target_operator_id,
    'Assignment lease expired',
    '{}'::jsonb
  );
END;
$$;
