-- The table was included in the legacy revoke sweep but omitted from the
-- authenticated table grant list. Keep the user-owned RLS policies as the
-- row boundary while making the intended API operations reachable.

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.user_gamification
TO authenticated;
