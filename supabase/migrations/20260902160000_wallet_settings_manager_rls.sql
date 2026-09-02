-- Global wallet configuration is manager-only at the database boundary.

DROP POLICY IF EXISTS "Workspace members can view wallet settings" ON public.wallet_settings;
CREATE POLICY "Workspace managers can view wallet settings"
  ON public.wallet_settings
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace members can view wallet bonus rules" ON public.wallet_bonus_rules;
CREATE POLICY "Workspace managers can view wallet bonus rules"
  ON public.wallet_bonus_rules
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));
