-- Countdown CRM: nullable team ownership snapshots.
-- This migration prepares operational records for team assignment without
-- changing current workspace-wide routing or guessing existing ownership.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS team_id UUID;

ALTER TABLE public.lead_queue_items
  ADD COLUMN IF NOT EXISTS team_id UUID;

ALTER TABLE public.lead_queue_events
  ADD COLUMN IF NOT EXISTS team_id UUID;

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS team_id UUID;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS team_id UUID;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_team_workspace_fkey,
  ADD CONSTRAINT leads_team_workspace_fkey
    FOREIGN KEY (team_id, workspace_id)
    REFERENCES public.teams(id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.lead_queue_items
  DROP CONSTRAINT IF EXISTS lead_queue_items_team_workspace_fkey,
  ADD CONSTRAINT lead_queue_items_team_workspace_fkey
    FOREIGN KEY (team_id, workspace_id)
    REFERENCES public.teams(id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.lead_queue_events
  DROP CONSTRAINT IF EXISTS lead_queue_events_team_workspace_fkey,
  ADD CONSTRAINT lead_queue_events_team_workspace_fkey
    FOREIGN KEY (team_id, workspace_id)
    REFERENCES public.teams(id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.calls
  DROP CONSTRAINT IF EXISTS calls_team_workspace_fkey,
  ADD CONSTRAINT calls_team_workspace_fkey
    FOREIGN KEY (team_id, workspace_id)
    REFERENCES public.teams(id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_team_workspace_fkey,
  ADD CONSTRAINT orders_team_workspace_fkey
    FOREIGN KEY (team_id, workspace_id)
    REFERENCES public.teams(id, workspace_id)
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS leads_workspace_team_idx
  ON public.leads(workspace_id, team_id, status);

CREATE INDEX IF NOT EXISTS lead_queue_items_workspace_team_idx
  ON public.lead_queue_items(workspace_id, team_id, state, available_at, priority DESC);

CREATE INDEX IF NOT EXISTS lead_queue_events_workspace_team_idx
  ON public.lead_queue_events(workspace_id, team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS calls_workspace_team_idx
  ON public.calls(workspace_id, team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_workspace_team_idx
  ON public.orders(workspace_id, team_id, created_at DESC);

COMMENT ON COLUMN public.leads.team_id IS
  'Current responsible team. NULL means ownership has not been confirmed yet.';
COMMENT ON COLUMN public.lead_queue_items.team_id IS
  'Operational team snapshot for routing. NULL until team ownership is confirmed.';
COMMENT ON COLUMN public.lead_queue_events.team_id IS
  'Team snapshot for queue history. NULL for events created before team ownership.';
COMMENT ON COLUMN public.calls.team_id IS
  'Historical team snapshot at call creation. NULL for legacy calls.';
COMMENT ON COLUMN public.orders.team_id IS
  'Historical team snapshot at order creation. NULL for legacy orders.';
