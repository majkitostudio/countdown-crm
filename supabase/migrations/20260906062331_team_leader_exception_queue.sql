-- Persist only the manager decision for a derived operational exception.
-- Exception rows themselves remain derived from their real source tables so
-- the UI cannot manufacture operational problems.

CREATE TABLE public.team_leader_exception_actions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  exception_key TEXT NOT NULL
    CHECK (
      char_length(exception_key) BETWEEN 1 AND 250
      AND exception_key ~* '^(queue:(outcome_recovery|overdue_callback|expired_lease)|workflow:failure|script:missing):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
  status TEXT NOT NULL CHECK (status IN ('resolved', 'snoozed')),
  resolution TEXT NOT NULL CHECK (char_length(resolution) BETWEEN 3 AND 2000),
  snoozed_until TIMESTAMPTZ,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_leader_exception_actions_workspace_key_unique
    UNIQUE (workspace_id, exception_key),
  CONSTRAINT team_leader_exception_actions_status_payload_check CHECK (
    (status = 'resolved' AND snoozed_until IS NULL)
    OR (status = 'snoozed' AND snoozed_until IS NOT NULL)
  )
);

CREATE INDEX team_leader_exception_actions_workspace_status_idx
  ON public.team_leader_exception_actions (workspace_id, status, snoozed_until);

CREATE INDEX team_leader_exception_actions_actor_id_idx
  ON public.team_leader_exception_actions (actor_id);

ALTER TABLE public.team_leader_exception_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.team_leader_exception_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_leader_exception_actions TO authenticated;

CREATE POLICY "Workspace managers can view exception actions"
  ON public.team_leader_exception_actions
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can create exception actions"
  ON public.team_leader_exception_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_manager_or_admin(workspace_id)
    AND actor_id = (SELECT auth.uid())
  );

CREATE POLICY "Workspace managers can update exception actions"
  ON public.team_leader_exception_actions
  FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (
    private.is_workspace_manager_or_admin(workspace_id)
    AND actor_id = (SELECT auth.uid())
  );

CREATE TRIGGER team_leader_exception_actions_workspace_immutable
  BEFORE UPDATE OF workspace_id ON public.team_leader_exception_actions
  FOR EACH ROW EXECUTE FUNCTION private.prevent_workspace_change();

CREATE OR REPLACE FUNCTION private.assert_team_leader_exception_active(
  p_workspace_id UUID,
  p_exception_key TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  exception_type TEXT;
  source_id UUID;
  source_occurred_at TIMESTAMPTZ;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Team Leader or Administrator access is required';
  END IF;

  IF p_exception_key IS NULL
     OR p_exception_key !~* '^(queue:(outcome_recovery|overdue_callback|expired_lease)|workflow:failure|script:missing):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Exception key is invalid';
  END IF;

  exception_type := split_part(p_exception_key, ':', 1) || ':' || split_part(p_exception_key, ':', 2);
  source_id := split_part(p_exception_key, ':', 3)::UUID;

  CASE exception_type
    WHEN 'queue:outcome_recovery' THEN
      SELECT queue_item.updated_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND (queue_item.recovery_required OR queue_item.state = 'awaiting_outcome');
    WHEN 'queue:overdue_callback' THEN
      SELECT queue_item.scheduled_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND queue_item.state = 'waiting_callback'
        AND queue_item.scheduled_at < NOW();
    WHEN 'queue:expired_lease' THEN
      SELECT queue_item.lease_expires_at
        INTO source_occurred_at
      FROM public.lead_queue_items AS queue_item
      WHERE queue_item.id = source_id
        AND queue_item.workspace_id = p_workspace_id
        AND queue_item.state = 'assigned'
        AND queue_item.lease_expires_at < NOW();
    WHEN 'workflow:failure' THEN
      SELECT execution.created_at
        INTO source_occurred_at
      FROM public.workflow_executions AS execution
      WHERE execution.id = source_id
        AND execution.workspace_id = p_workspace_id
        AND execution.status = 'failure';
    WHEN 'script:missing' THEN
      SELECT product.created_at
        INTO source_occurred_at
      FROM public.products AS product
      WHERE product.id = source_id
        AND product.workspace_id = p_workspace_id
        AND product.in_stock
        AND NOT EXISTS (
          SELECT 1
          FROM public.product_scripts AS script
          WHERE script.workspace_id = product.workspace_id
            AND script.product_id = product.id
        );
  END CASE;

  IF source_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Exception is no longer active';
  END IF;

  RETURN source_occurred_at;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_team_leader_exception_active(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.assert_team_leader_exception_active(UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.prepare_team_leader_exception_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.exception_key IS DISTINCT FROM OLD.exception_key
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ) THEN
    RAISE EXCEPTION 'Exception action identity cannot be changed';
  END IF;

  PERFORM private.assert_team_leader_exception_active(NEW.workspace_id, NEW.exception_key);
  NEW.actor_id := (SELECT auth.uid());
  NEW.previous_state := CASE
    WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
      'status', OLD.status,
      'resolution', OLD.resolution,
      'snoozed_until', OLD.snoozed_until,
      'actor_id', OLD.actor_id,
      'updated_at', OLD.updated_at
    )
    ELSE '{}'::jsonb
  END;
  NEW.new_state := jsonb_build_object(
    'status', NEW.status,
    'resolution', NEW.resolution,
    'snoozed_until', NEW.snoozed_until,
    'actor_id', NEW.actor_id
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_leader_exception_actions_prepare
  BEFORE INSERT OR UPDATE ON public.team_leader_exception_actions
  FOR EACH ROW EXECUTE FUNCTION private.prepare_team_leader_exception_action();

CREATE OR REPLACE FUNCTION private.audit_team_leader_exception_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_name_value TEXT;
BEGIN
  SELECT NULLIF(TRIM(profile.full_name), '')
    INTO actor_name_value
  FROM public.profiles AS profile
  WHERE profile.id = NEW.actor_id;

  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    actor_name,
    action,
    target_resource,
    details,
    severity,
    ip_address
  )
  VALUES (
    NEW.workspace_id,
    NEW.actor_id,
    COALESCE(actor_name_value, 'Unknown manager'),
    CASE WHEN NEW.status = 'resolved' THEN 'EXCEPTION_RESOLVED' ELSE 'EXCEPTION_SNOOZED' END,
    NEW.exception_key,
    format(
      'Exception state changed from %s to %s. Reason: %s',
      COALESCE(NEW.previous_state ->> 'status', 'open'),
      NEW.status,
      NEW.resolution
    ),
    CASE WHEN NEW.status = 'resolved' THEN 'medium' ELSE 'low' END,
    '127.0.0.1'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER team_leader_exception_actions_audit
  AFTER INSERT OR UPDATE ON public.team_leader_exception_actions
  FOR EACH ROW EXECUTE FUNCTION private.audit_team_leader_exception_action();

CREATE OR REPLACE FUNCTION public.resolve_team_leader_exception(
  p_workspace_id UUID,
  p_exception_key TEXT,
  p_resolution TEXT
)
RETURNS SETOF public.team_leader_exception_actions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_action public.team_leader_exception_actions;
  normalized_resolution TEXT := TRIM(p_resolution);
  source_occurred_at TIMESTAMPTZ;
BEGIN
  source_occurred_at := private.assert_team_leader_exception_active(p_workspace_id, p_exception_key);

  IF normalized_resolution IS NULL
     OR char_length(normalized_resolution) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION 'Resolution must be between 3 and 2,000 characters';
  END IF;

  SELECT action.*
    INTO current_action
  FROM public.team_leader_exception_actions AS action
  WHERE action.workspace_id = p_workspace_id
    AND action.exception_key = p_exception_key
  FOR UPDATE;

  IF FOUND
     AND current_action.status = 'resolved'
     AND current_action.resolution = normalized_resolution
     AND current_action.updated_at >= source_occurred_at THEN
    RETURN NEXT current_action;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.team_leader_exception_actions (
    workspace_id,
    exception_key,
    status,
    resolution,
    snoozed_until,
    actor_id
  )
  VALUES (
    p_workspace_id,
    p_exception_key,
    'resolved',
    normalized_resolution,
    NULL,
    (SELECT auth.uid())
  )
  ON CONFLICT (workspace_id, exception_key) DO UPDATE
  SET status = EXCLUDED.status,
      resolution = EXCLUDED.resolution,
      snoozed_until = NULL,
      actor_id = EXCLUDED.actor_id
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.snooze_team_leader_exception(
  p_workspace_id UUID,
  p_exception_key TEXT,
  p_snoozed_until TIMESTAMPTZ,
  p_reason TEXT
)
RETURNS SETOF public.team_leader_exception_actions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_action public.team_leader_exception_actions;
  normalized_reason TEXT := TRIM(p_reason);
  source_occurred_at TIMESTAMPTZ;
BEGIN
  source_occurred_at := private.assert_team_leader_exception_active(p_workspace_id, p_exception_key);

  IF normalized_reason IS NULL
     OR char_length(normalized_reason) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION 'Snooze reason must be between 3 and 2,000 characters';
  END IF;

  IF p_snoozed_until IS NULL
     OR p_snoozed_until <= NOW()
     OR p_snoozed_until > NOW() + INTERVAL '90 days' THEN
    RAISE EXCEPTION 'Snooze time must be in the next 90 days';
  END IF;

  SELECT action.*
    INTO current_action
  FROM public.team_leader_exception_actions AS action
  WHERE action.workspace_id = p_workspace_id
    AND action.exception_key = p_exception_key
  FOR UPDATE;

  IF FOUND
     AND current_action.status = 'snoozed'
     AND current_action.resolution = normalized_reason
     AND current_action.snoozed_until = p_snoozed_until
     AND current_action.updated_at >= source_occurred_at THEN
    RETURN NEXT current_action;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.team_leader_exception_actions (
    workspace_id,
    exception_key,
    status,
    resolution,
    snoozed_until,
    actor_id
  )
  VALUES (
    p_workspace_id,
    p_exception_key,
    'snoozed',
    normalized_reason,
    p_snoozed_until,
    (SELECT auth.uid())
  )
  ON CONFLICT (workspace_id, exception_key) DO UPDATE
  SET status = EXCLUDED.status,
      resolution = EXCLUDED.resolution,
      snoozed_until = EXCLUDED.snoozed_until,
      actor_id = EXCLUDED.actor_id
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_team_leader_exception(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_team_leader_exception(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.snooze_team_leader_exception(UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.snooze_team_leader_exception(UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
