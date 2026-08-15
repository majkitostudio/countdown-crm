-- Countdown CRM: session-only AI trainer transcripts.
-- These tables are intentionally separate from public.calls and public.orders.

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  scenario_id TEXT NOT NULL,
  scenario_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  target_product TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'abandoned')),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  ai_source TEXT CHECK (ai_source IN ('gemini-flash', 'openai-responses', 'rule-engine')),
  scorecard JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_session_turns (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL CHECK (sequence_number >= 0),
  speaker TEXT NOT NULL CHECK (speaker IN ('operator', 'customer')),
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 4000),
  source TEXT NOT NULL CHECK (source IN ('typed', 'browser_speech', 'ai_customer', 'scenario')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  UNIQUE (session_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS training_sessions_workspace_created_idx
  ON public.training_sessions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS training_sessions_operator_created_idx
  ON public.training_sessions(operator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS training_session_turns_session_sequence_idx
  ON public.training_session_turns(session_id, sequence_number);
CREATE INDEX IF NOT EXISTS training_session_turns_workspace_idx
  ON public.training_session_turns(workspace_id);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view training sessions" ON public.training_sessions;
CREATE POLICY "Workspace members can view training sessions" ON public.training_sessions
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Operators can create own training sessions" ON public.training_sessions;
CREATE POLICY "Operators can create own training sessions" ON public.training_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    operator_id = auth.uid()
    AND private.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Operators can update own training sessions" ON public.training_sessions;
CREATE POLICY "Operators can update own training sessions" ON public.training_sessions
  FOR UPDATE TO authenticated
  USING (operator_id = auth.uid() AND private.is_workspace_member(workspace_id))
  WITH CHECK (operator_id = auth.uid() AND private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can delete training sessions" ON public.training_sessions;
CREATE POLICY "Workspace managers can delete training sessions" ON public.training_sessions
  FOR DELETE TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace members can view training turns" ON public.training_session_turns;
CREATE POLICY "Workspace members can view training turns" ON public.training_session_turns
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Operators can create own training turns" ON public.training_session_turns;
CREATE POLICY "Operators can create own training turns" ON public.training_session_turns
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.training_sessions AS session
      WHERE session.id = training_session_turns.session_id
        AND session.workspace_id = training_session_turns.workspace_id
        AND session.operator_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.training_sessions,
  public.training_session_turns
TO authenticated;
