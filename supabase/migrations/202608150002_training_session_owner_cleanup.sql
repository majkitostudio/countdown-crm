-- Allow an operator to remove an incomplete session created by a failed transcript write.
-- Managers/admins retain the broader cleanup policy from the parent migration.

DROP POLICY IF EXISTS "Operators can delete own training sessions" ON public.training_sessions;
CREATE POLICY "Operators can delete own training sessions" ON public.training_sessions
  FOR DELETE TO authenticated
  USING (operator_id = auth.uid() AND private.is_workspace_member(workspace_id));
