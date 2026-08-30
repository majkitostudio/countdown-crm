-- Make workflow event delivery idempotent across server instances. The
-- process-local in-flight map remains an optimization; this index is the
-- durable concurrency boundary.

ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workflow_executions_event_id_uidx
  ON public.workflow_executions (
    workspace_id,
    COALESCE(rule_id, '00000000-0000-0000-0000-000000000000'::UUID),
    event_id
  )
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS workflow_executions_event_id_idx
  ON public.workflow_executions(workspace_id, event_id)
  WHERE event_id IS NOT NULL;
