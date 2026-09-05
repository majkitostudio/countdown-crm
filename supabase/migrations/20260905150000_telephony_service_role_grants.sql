-- The server-owned telephony DAL uses the Supabase service role.
-- Keep these privileges explicit; authenticated clients remain read-only/RLS-scoped.

GRANT SELECT, INSERT, UPDATE ON TABLE public.workspace_telephony_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.telephony_call_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.telephony_call_events TO service_role;
