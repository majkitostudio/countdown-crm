-- Finish the role vocabulary cleanup for policies created by earlier migrations.

ALTER POLICY "Workspace managers can view audit logs"
  ON public.audit_logs RENAME TO "Team Leaders and Administrators can view audit logs";
ALTER POLICY "Workspace managers can update orders"
  ON public.orders RENAME TO "Team Leaders and Administrators can update orders";
ALTER POLICY "Training turns are visible to owners and managers"
  ON public.training_session_turns RENAME TO "Training turns are visible to owners, Team Leaders and Administrators";
ALTER POLICY "Organization admins can update their organizations"
  ON public.organizations RENAME TO "Administrators can update their organizations";
ALTER POLICY "Workspace admins can update their workspaces"
  ON public.workspaces RENAME TO "Administrators can update their workspaces";
