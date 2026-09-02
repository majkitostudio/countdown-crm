-- Manager queue operations: prepare a preferred queue without creating a
-- second active assignment, and keep the existing safe release/reset path.

ALTER TABLE public.lead_queue_events
  DROP CONSTRAINT IF EXISTS lead_queue_events_event_type_check;
ALTER TABLE public.lead_queue_events
  ADD CONSTRAINT lead_queue_events_event_type_check CHECK (event_type IN (
    'created', 'claimed', 'started', 'heartbeat', 'completed', 'released',
    'reassigned', 'queued', 'callback_scheduled', 'requeued', 'lease_expired',
    'interrupted', 'outcome_pending', 'reopened', 'paused'
  ));

CREATE OR REPLACE FUNCTION private.queue_lead_for_operator_impl(
  target_queue_item_id UUID,
  target_operator_id UUID,
  queue_reason TEXT
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
  SELECT * INTO queue_item
  FROM public.lead_queue_items
  WHERE id = target_queue_item_id
  FOR UPDATE;

  IF queue_item.id IS NULL OR NOT private.is_workspace_manager_or_admin(queue_item.workspace_id) THEN
    RAISE EXCEPTION 'Queue item is not available for operator queueing';
  END IF;
  IF target_operator_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = queue_item.workspace_id
      AND member.user_id = target_operator_id
      AND member.role = 'operator'
  ) THEN
    RAISE EXCEPTION 'Target user is not an Operator in this workspace';
  END IF;
  IF queue_item.state NOT IN ('available', 'waiting_callback') THEN
    RAISE EXCEPTION 'Only available or callback leads can be queued for an Operator';
  END IF;

  UPDATE public.lead_queue_items
  SET preferred_operator_id = target_operator_id, updated_at = NOW()
  WHERE id = target_queue_item_id;

  PERFORM private.record_queue_event(
    target_queue_item_id, 'queued', queue_item.state, queue_item.state,
    NULL, target_operator_id, current_user_id,
    NULLIF(TRIM(queue_reason), ''),
    jsonb_build_object('queue_mode', 'preferred_operator')
  );
  RETURN private.queue_snapshot(target_queue_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_lead_for_operator(
  target_queue_item_id UUID,
  target_operator_id UUID,
  queue_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$ SELECT private.queue_lead_for_operator_impl(target_queue_item_id, target_operator_id, queue_reason); $$;

REVOKE ALL ON FUNCTION public.queue_lead_for_operator(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_lead_for_operator(UUID, UUID, TEXT) TO authenticated;
