-- Cover the composite team/workspace foreign keys in their declared order.
-- These indexes do not change application behavior; they keep ownership writes
-- efficient as the workspace grows.

CREATE INDEX IF NOT EXISTS team_memberships_team_workspace_fk_idx
  ON public.team_memberships(team_id, workspace_id);

CREATE INDEX IF NOT EXISTS leads_team_workspace_fk_idx
  ON public.leads(team_id, workspace_id);

CREATE INDEX IF NOT EXISTS lead_queue_items_team_workspace_fk_idx
  ON public.lead_queue_items(team_id, workspace_id);

CREATE INDEX IF NOT EXISTS lead_queue_events_team_workspace_fk_idx
  ON public.lead_queue_events(team_id, workspace_id);

CREATE INDEX IF NOT EXISTS calls_team_workspace_fk_idx
  ON public.calls(team_id, workspace_id);

CREATE INDEX IF NOT EXISTS orders_team_workspace_fk_idx
  ON public.orders(team_id, workspace_id);
