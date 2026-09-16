-- Server-owned AI recommendations for real-call note quality.
-- Training sessions are stored separately and never create rows here.

CREATE TABLE IF NOT EXISTS public.call_quality_reviews (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ok', 'review', 'unavailable')),
  signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  missing_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  reasons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'unavailable')),
  model TEXT,
  error_code TEXT,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT call_quality_reviews_call_unique UNIQUE (call_id),
  CONSTRAINT call_quality_reviews_workspace_call_unique UNIQUE (workspace_id, call_id)
);

CREATE INDEX IF NOT EXISTS call_quality_reviews_workspace_status_idx
  ON public.call_quality_reviews (workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS call_quality_reviews_workspace_evaluated_idx
  ON public.call_quality_reviews (workspace_id, evaluated_at DESC);

ALTER TABLE public.call_quality_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.call_quality_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.call_quality_reviews TO authenticated, service_role;

CREATE POLICY "Managers can view scoped call quality reviews"
  ON public.call_quality_reviews
  FOR SELECT TO authenticated
  USING (private.can_access_call_review(workspace_id, call_id));

COMMENT ON TABLE public.call_quality_reviews IS
  'Server-owned Gemini recommendation for completeness of a real call note; never an operator verdict.';
COMMENT ON COLUMN public.call_quality_reviews.signals IS
  'Deterministic signals such as missing_note, short_note or short_call.';
COMMENT ON COLUMN public.call_quality_reviews.missing_sections IS
  'Potentially missing note sections, not a disciplinary decision.';
