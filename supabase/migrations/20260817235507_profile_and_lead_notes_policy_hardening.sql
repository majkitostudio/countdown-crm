-- Tighten profile visibility to operators who share a workspace with the
-- authenticated user. Profiles do not carry workspace_id themselves, so the
-- membership relation is the tenant boundary.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Workspace members can view shared profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members AS member
      WHERE member.user_id = profiles.id
        AND private.is_workspace_member(member.workspace_id)
    )
  );

-- The table grants already target authenticated, so align the policies with
-- the same role boundary and keep anonymous Data API callers out explicitly.
ALTER POLICY "Workspace members can view lead notes"
  ON public.lead_notes TO authenticated;
ALTER POLICY "Workspace members can create lead notes"
  ON public.lead_notes TO authenticated;
REVOKE ALL ON TABLE public.lead_notes FROM anon;
