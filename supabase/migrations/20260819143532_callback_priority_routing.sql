-- Splatné callbacky jsou vždy první routovatelná práce. Preference původního
-- Operátora zůstává tie-breakerem až uvnitř stejné priority.
CREATE OR REPLACE FUNCTION private.claim_next_lead_impl(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  candidate_id UUID;
  current_item RECORD;
  candidate_item RECORD;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = current_user_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Only Operators can claim queue work';
  END IF;

  PERFORM private.release_expired_operator_assignment(target_workspace_id, current_user_id);

  SELECT *
  INTO current_item
  FROM public.lead_queue_items
  WHERE workspace_id = target_workspace_id
    AND assigned_operator_id = current_user_id
    AND state IN ('assigned', 'in_progress')
  FOR UPDATE;

  IF current_item.id IS NOT NULL THEN
    RETURN private.queue_snapshot(current_item.id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operator_presence AS presence
    WHERE presence.workspace_id = target_workspace_id
      AND presence.operator_id = current_user_id
      AND presence.state = 'available'
      AND presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Operator is not available for queue work';
  END IF;

  SELECT queue_item.id
  INTO candidate_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.state IN ('available', 'waiting_callback')
    AND queue_item.available_at <= NOW()
    AND (queue_item.scheduled_at IS NULL OR queue_item.scheduled_at <= NOW())
    AND (
      queue_item.preferred_operator_id IS NULL
      OR queue_item.preferred_operator_id = current_user_id
      OR NOT EXISTS (
        SELECT 1
        FROM public.operator_presence AS preferred_presence
        WHERE preferred_presence.workspace_id = target_workspace_id
          AND preferred_presence.operator_id = queue_item.preferred_operator_id
          AND preferred_presence.state = 'available'
          AND preferred_presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
      )
    )
  ORDER BY
    CASE WHEN queue_item.state = 'waiting_callback' THEN 0 ELSE 1 END,
    CASE WHEN queue_item.preferred_operator_id = current_user_id THEN 0 ELSE 1 END,
    queue_item.priority DESC,
    COALESCE(queue_item.scheduled_at, queue_item.available_at) ASC,
    queue_item.created_at ASC,
    queue_item.id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF candidate_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO candidate_item
  FROM public.lead_queue_items
  WHERE id = candidate_id
  FOR UPDATE;

  UPDATE public.lead_queue_items
  SET state = 'assigned',
      assigned_operator_id = current_user_id,
      claimed_at = NOW(),
      last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      attempt_count = attempt_count + 1,
      released_at = NULL,
      updated_at = NOW()
  WHERE id = candidate_id;

  PERFORM private.record_queue_event(
    candidate_id,
    'claimed',
    candidate_item.state,
    'assigned',
    candidate_item.assigned_operator_id,
    current_user_id,
    current_user_id,
    NULL,
    '{}'::jsonb
  );

  RETURN private.queue_snapshot(candidate_id);
END;
$$;
