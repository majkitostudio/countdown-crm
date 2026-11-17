-- Server-side member provisioning reads the team and profile, creates a
-- missing profile, and optionally assigns the member to a team. Existing
-- workspace_members SELECT/INSERT grants are provided by 20260905090000.
GRANT SELECT ON TABLE public.teams TO service_role;
GRANT SELECT, INSERT ON TABLE public.profiles TO service_role;
GRANT INSERT ON TABLE public.team_memberships TO service_role;
