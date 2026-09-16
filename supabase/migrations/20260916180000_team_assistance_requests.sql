-- Simple in-office assistance signal for operators and Team Leaders.
-- Assistance visibility is workspace-wide for managers, while management data remains scoped elsewhere.

CREATE TABLE IF NOT EXISTS public.team_assistance_requests (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES public.lead_queue_items(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('help', 'sos')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved', 'cancelled')),
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_assistance_requests_workspace_status_idx
  ON public.team_assistance_requests (workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS team_assistance_requests_workspace_team_idx
  ON public.team_assistance_requests (workspace_id, team_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS team_assistance_requests_operator_active_idx
  ON public.team_assistance_requests (workspace_id, operator_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_assistance_request_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.team_assistance_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('requested', 'claimed', 'resolved', 'cancelled')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_assistance_request_events_request_idx
  ON public.team_assistance_request_events (request_id, created_at DESC);

ALTER TABLE public.team_assistance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_assistance_request_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.team_assistance_requests, public.team_assistance_request_events
  FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_assistance_requests TO authenticated;
GRANT SELECT ON TABLE public.team_assistance_request_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_assistance_requests TO service_role;
GRANT SELECT, INSERT ON TABLE public.team_assistance_request_events TO service_role;

CREATE POLICY "Managers can view workspace assistance requests"
  ON public.team_assistance_requests
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (operator_id = (SELECT auth.uid()) AND private.is_workspace_member(workspace_id))
  );

CREATE POLICY "Operators can create own assistance requests"
  ON public.team_assistance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    operator_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Managers can update assistance requests"
  ON public.team_assistance_requests
  FOR UPDATE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id))
  WITH CHECK (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Assistance participants can view request events"
  ON public.team_assistance_request_events
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_assistance_requests AS request
      WHERE request.id = team_assistance_request_events.request_id
        AND request.workspace_id = team_assistance_request_events.workspace_id
        AND request.operator_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.claim_team_assistance_request(target_request_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  changed BOOLEAN := FALSE;
  request_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO request_workspace_id
  FROM public.team_assistance_requests
  WHERE id = target_request_id;

  IF request_workspace_id IS NULL OR NOT private.is_workspace_manager_or_admin(request_workspace_id) THEN
    RAISE EXCEPTION 'Assistance request is not available to this manager';
  END IF;

  UPDATE public.team_assistance_requests
  SET status = 'claimed',
      claimed_by = (SELECT auth.uid()),
      claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = target_request_id
    AND status = 'open'
  RETURNING TRUE INTO changed;

  IF COALESCE(changed, FALSE) THEN
    INSERT INTO public.team_assistance_request_events
      (workspace_id, request_id, actor_id, event_type, from_status, to_status)
    VALUES
      (request_workspace_id, target_request_id, (SELECT auth.uid()), 'claimed', 'open', 'claimed');
  END IF;

  RETURN COALESCE(changed, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_team_assistance_request(target_request_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  changed BOOLEAN := FALSE;
  request_workspace_id UUID;
  previous_status TEXT;
BEGIN
  SELECT workspace_id, status INTO request_workspace_id, previous_status
  FROM public.team_assistance_requests
  WHERE id = target_request_id;

  IF request_workspace_id IS NULL OR NOT private.is_workspace_manager_or_admin(request_workspace_id) THEN
    RAISE EXCEPTION 'Assistance request is not available to this manager';
  END IF;

  UPDATE public.team_assistance_requests
  SET status = 'resolved',
      resolved_by = (SELECT auth.uid()),
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id = target_request_id
    AND status IN ('open', 'claimed')
  RETURNING TRUE INTO changed;

  IF COALESCE(changed, FALSE) THEN
    INSERT INTO public.team_assistance_request_events
      (workspace_id, request_id, actor_id, event_type, from_status, to_status)
    VALUES
      (request_workspace_id, target_request_id, (SELECT auth.uid()), 'resolved', previous_status, 'resolved');
  END IF;

  RETURN COALESCE(changed, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_team_assistance_request(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_team_assistance_request(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_team_assistance_request(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_team_assistance_request(UUID) TO authenticated, service_role;
