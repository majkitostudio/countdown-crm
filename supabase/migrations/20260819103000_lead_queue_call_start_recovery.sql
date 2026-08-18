CREATE OR REPLACE FUNCTION private.abort_lead_call_start_impl(
  target_queue_item_id UUID,
  abort_reason TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  queue_item RECORD;
BEGIN
  SELECT *
  INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
    AND assigned_operator_id = current_user_id
    AND state = 'in_progress'
  FOR UPDATE;

  IF queue_item.id IS NULL THEN
    RAISE EXCEPTION 'Lead call start cannot be aborted for this assignment';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only an Operator member can abort queue work';
  END IF;

  UPDATE public.lead_queue_items
  SET state = 'assigned',
      last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      updated_at = NOW()
  WHERE id = target_queue_item_id;

  UPDATE public.operator_presence
  SET state = 'available', last_heartbeat_at = NOW(), updated_at = NOW()
  WHERE workspace_id = queue_item.workspace_id AND operator_id = current_user_id;

  PERFORM private.record_queue_event(
    target_queue_item_id,
    'requeued',
    'in_progress',
    'assigned',
    current_user_id,
    current_user_id,
    current_user_id,
    NULLIF(TRIM(abort_reason), ''),
    '{}'::jsonb
  );

  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.abort_lead_call_start(
  target_queue_item_id UUID,
  abort_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.abort_lead_call_start_impl(target_queue_item_id, abort_reason); $$;

REVOKE ALL ON FUNCTION public.abort_lead_call_start(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abort_lead_call_start(UUID, TEXT) TO authenticated;
