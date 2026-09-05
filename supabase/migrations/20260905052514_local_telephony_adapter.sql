-- Workspace-scoped adapter selection and provider-neutral local call correlation.

CREATE TABLE IF NOT EXISTS public.workspace_telephony_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  active_adapter TEXT NOT NULL DEFAULT 'simulation'
    CHECK (active_adapter IN ('simulation', 'local_sip', 'telnyx')),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.telephony_call_sessions
  DROP CONSTRAINT IF EXISTS telephony_call_sessions_provider_check;
ALTER TABLE public.telephony_call_sessions
  ADD CONSTRAINT telephony_call_sessions_provider_check
  CHECK (provider IN ('telnyx', 'local_sip'));

ALTER TABLE public.telephony_call_events
  DROP CONSTRAINT IF EXISTS telephony_call_events_provider_check;
ALTER TABLE public.telephony_call_events
  ADD CONSTRAINT telephony_call_events_provider_check
  CHECK (provider IN ('telnyx', 'local_sip'));

ALTER TABLE public.telephony_call_sessions
  ADD COLUMN IF NOT EXISTS provider_call_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS telephony_sessions_provider_call_id_idx
  ON public.telephony_call_sessions (provider, provider_call_id)
  WHERE provider_call_id IS NOT NULL;

ALTER TABLE public.workspace_telephony_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_telephony_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.workspace_telephony_settings TO authenticated;

CREATE POLICY "Workspace members can view telephony settings"
  ON public.workspace_telephony_settings FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

CREATE POLICY "workspace_telephony_settings_admin_insert"
  ON public.workspace_telephony_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "workspace_telephony_settings_admin_update"
  ON public.workspace_telephony_settings FOR UPDATE TO authenticated
  USING (private.is_workspace_admin(workspace_id))
  WITH CHECK (private.is_workspace_admin(workspace_id));

COMMENT ON TABLE public.workspace_telephony_settings IS 'Workspace-scoped telephony adapter selection; simulation is the safe default.';
