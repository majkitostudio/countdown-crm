-- Countdown CRM: Task 2.3 — Instant Scheduled Routing within Campaign/Team
-- As agreed: The time commitment to customer (e.g. 16:00) takes top priority.
-- If preferred operator is claiming next lead, they get their own scheduled callback first (Priority 0).
-- If any other operator from the same campaign/team is available, they can claim the due scheduled callback
-- immediately without any 15-minute delay (Priority 2, ahead of regular leads).

CREATE OR REPLACE FUNCTION private.claim_next_lead_impl(target_workspace_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  operator_team_id UUID;
  candidate_id UUID;
  current_item RECORD;
  candidate_item RECORD;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  operator_team_id := private.current_operator_team_id(target_workspace_id);

  PERFORM private.release_expired_operator_assignment(target_workspace_id, current_user_id);

  SELECT * INTO current_item
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.assigned_operator_id = current_user_id
    AND queue_item.state IN ('assigned', 'in_progress', 'awaiting_outcome')
  FOR UPDATE;

  IF current_item.id IS NOT NULL THEN
    IF current_item.team_id IS NULL THEN
      RAISE EXCEPTION 'Current queue assignment has no team ownership; contact an Administrator';
    END IF;
    IF current_item.team_id <> operator_team_id THEN
      RAISE EXCEPTION 'Current queue assignment belongs to another team';
    END IF;
    RETURN private.queue_snapshot(current_item.id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operator_presence AS presence
    WHERE presence.workspace_id = target_workspace_id
      AND presence.operator_id = current_user_id
      AND presence.state = 'available'
      AND presence.last_heartbeat_at > NOW() - INTERVAL '5 minutes'
  ) THEN RAISE EXCEPTION 'Operator is not available for queue work'; END IF;

  SELECT queue_item.id INTO candidate_id
  FROM public.lead_queue_items AS queue_item
  WHERE queue_item.workspace_id = target_workspace_id
    AND queue_item.team_id = operator_team_id
    AND queue_item.state IN ('available', 'waiting_callback')
    AND queue_item.available_at <= NOW()
    AND (queue_item.scheduled_at IS NULL OR queue_item.scheduled_at <= NOW())
  ORDER BY
    -- Priority 0: Waiting callbacks for the CURRENT operator (top priority match)
    CASE
      WHEN queue_item.state = 'waiting_callback' AND queue_item.preferred_operator_id = current_user_id THEN 0
      WHEN queue_item.preferred_operator_id = current_user_id THEN 1
      WHEN queue_item.state = 'waiting_callback' THEN 2
      ELSE 3
    END,
    queue_item.priority DESC,
    COALESCE(queue_item.scheduled_at, queue_item.available_at) ASC,
    queue_item.created_at ASC,
    queue_item.id ASC
  FOR UPDATE SKIP LOCKED LIMIT 1;

  IF candidate_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO candidate_item
  FROM public.lead_queue_items
  WHERE id = candidate_id
  FOR UPDATE;

  UPDATE public.lead_queue_items
  SET state = 'assigned', assigned_operator_id = current_user_id,
      claimed_at = NOW(), last_heartbeat_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '10 minutes',
      attempt_count = attempt_count + 1, released_at = NULL,
      recovery_required = FALSE, call_started_at = NULL, call_ended_at = NULL,
      updated_at = NOW()
  WHERE id = candidate_id;

  PERFORM private.record_queue_event(
    candidate_id, 'claimed', candidate_item.state, 'assigned',
    candidate_item.assigned_operator_id, current_user_id, current_user_id,
    NULL, '{}'
  );
  RETURN private.queue_snapshot(candidate_id);
END;
$$;
