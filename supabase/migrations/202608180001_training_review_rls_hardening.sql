-- Align the database read boundary for Teamleader Review with the
-- manager/admin boundary enforced by the application DAL and API routes.
-- Training remains session-only: operators can still create and maintain
-- their own session lifecycle, while review reads are manager/admin-only.

DROP POLICY IF EXISTS "Workspace members can view training sessions"
  ON public.training_sessions;
DROP POLICY IF EXISTS "Workspace managers can view training sessions"
  ON public.training_sessions;
DROP POLICY IF EXISTS "Training sessions are visible to owners and managers"
  ON public.training_sessions;
CREATE POLICY "Training sessions are visible to owners and managers"
  ON public.training_sessions
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      operator_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Operators can create own training sessions"
  ON public.training_sessions;
CREATE POLICY "Operators can create own training sessions"
  ON public.training_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    operator_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Operators can update own training sessions"
  ON public.training_sessions;
CREATE POLICY "Operators can update own training sessions"
  ON public.training_sessions
  FOR UPDATE TO authenticated
  USING (
    operator_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    operator_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Workspace managers can delete training sessions"
  ON public.training_sessions;
DROP POLICY IF EXISTS "Operators and managers can delete training sessions"
  ON public.training_sessions;
DROP POLICY IF EXISTS "Operators can delete own training sessions"
  ON public.training_sessions;
CREATE POLICY "Operators and managers can delete training sessions"
  ON public.training_sessions
  FOR DELETE TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      operator_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Workspace members can view training turns"
  ON public.training_session_turns;
DROP POLICY IF EXISTS "Workspace managers can view training turns"
  ON public.training_session_turns;
DROP POLICY IF EXISTS "Training turns are visible to owners and managers"
  ON public.training_session_turns;
CREATE POLICY "Training turns are visible to owners and managers"
  ON public.training_session_turns
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR EXISTS (
      SELECT 1
      FROM public.training_sessions AS session
      WHERE session.id = training_session_turns.session_id
        AND session.workspace_id = training_session_turns.workspace_id
        AND session.operator_id = (SELECT auth.uid())
        AND private.is_workspace_member(training_session_turns.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Operators can create own training turns"
  ON public.training_session_turns;
CREATE POLICY "Operators can create own training turns"
  ON public.training_session_turns
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.training_sessions AS session
      WHERE session.id = training_session_turns.session_id
        AND session.workspace_id = training_session_turns.workspace_id
        AND session.operator_id = (SELECT auth.uid())
    )
  );
