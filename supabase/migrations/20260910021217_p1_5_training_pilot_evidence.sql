-- P1.5 keeps training evidence separate from live commercial calls while
-- making each completed session safely replayable and idempotent.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS completion_key UUID,
  ADD COLUMN IF NOT EXISTS script_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_operator_completion_key_idx
  ON public.training_sessions(workspace_id, operator_id, completion_key)
  WHERE completion_key IS NOT NULL;
