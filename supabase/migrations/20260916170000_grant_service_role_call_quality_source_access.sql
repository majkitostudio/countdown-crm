-- The server-owned AI quality worker reads completed calls through the service role.
-- Keep this read-only: call mutations remain owned by the authenticated call flows.
GRANT SELECT ON TABLE public.calls TO service_role;
