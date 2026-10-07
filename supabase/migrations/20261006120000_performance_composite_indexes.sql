-- Performance Composite Indexes for High-Traffic Workspace Queries
-- Optimizes ordering and sorting for calls, orders, and leads at scale.

CREATE INDEX IF NOT EXISTS calls_workspace_created_at_desc_idx
  ON public.calls (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS calls_agent_created_at_desc_idx
  ON public.calls (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_workspace_created_at_desc_idx
  ON public.orders (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_agent_created_at_desc_idx
  ON public.orders (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_workspace_created_at_desc_idx
  ON public.leads (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_workspace_status_idx
  ON public.leads (workspace_id, status);

CREATE INDEX IF NOT EXISTS lead_queue_items_assigned_state_idx
  ON public.lead_queue_items (assigned_operator_id, state);
