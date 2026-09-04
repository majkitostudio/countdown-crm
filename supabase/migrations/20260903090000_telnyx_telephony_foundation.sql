-- Telnyx browser calling foundation.
-- Provider credentials and webhook events are server-owned integration data.

CREATE TABLE IF NOT EXISTS public.telephony_credentials (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'telnyx'),
  provider_credential_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, operator_id, provider)
);

CREATE TABLE IF NOT EXISTS public.telephony_call_sessions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES public.lead_queue_items(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider = 'telnyx'),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  telnyx_call_control_id TEXT,
  telnyx_call_leg_id TEXT,
  telnyx_call_session_id TEXT,
  telnyx_connection_id TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'ringing', 'connected', 'held', 'ended', 'failed')),
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  recording_id TEXT,
  recording_url TEXT,
  hangup_cause TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS telephony_sessions_telnyx_control_id_idx
  ON public.telephony_call_sessions (telnyx_call_control_id)
  WHERE telnyx_call_control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS telephony_sessions_workspace_created_idx
  ON public.telephony_call_sessions (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS telephony_sessions_lead_created_idx
  ON public.telephony_call_sessions (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.telephony_call_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES public.telephony_call_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider = 'telnyx'),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_call_control_id TEXT,
  provider_call_leg_id TEXT,
  provider_call_session_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS telephony_events_session_created_idx
  ON public.telephony_call_events (call_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS telephony_events_workspace_created_idx
  ON public.telephony_call_events (workspace_id, created_at DESC);

ALTER TABLE public.telephony_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telephony_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telephony_call_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telephony_credentials, public.telephony_call_sessions, public.telephony_call_events
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.telephony_call_sessions, public.telephony_call_events TO authenticated;

CREATE POLICY "Workspace members can view telephony sessions"
  ON public.telephony_call_sessions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view telephony events"
  ON public.telephony_call_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

COMMENT ON TABLE public.telephony_credentials IS 'Server-owned Telnyx WebRTC credentials; never expose provider secrets to clients.';
COMMENT ON TABLE public.telephony_call_sessions IS 'Provider call lifecycle, correlated with a CRM lead and optional queue item.';
COMMENT ON TABLE public.telephony_call_events IS 'Idempotent Telnyx webhook audit trail.';
