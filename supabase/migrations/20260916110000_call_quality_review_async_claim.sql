-- Harden and decouple real-call AI quality review processing.
-- The service role is the only writer; authenticated users remain read-only
-- through the existing team-scoped RLS policy.

ALTER TABLE public.call_quality_reviews
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_code TEXT;

ALTER TABLE public.call_quality_reviews
  DROP CONSTRAINT IF EXISTS call_quality_reviews_attempt_count_check;
ALTER TABLE public.call_quality_reviews
  ADD CONSTRAINT call_quality_reviews_attempt_count_check CHECK (attempt_count >= 0);

CREATE INDEX IF NOT EXISTS call_quality_reviews_pending_claim_idx
  ON public.call_quality_reviews (status, claim_expires_at)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON TABLE public.call_quality_reviews TO service_role;

CREATE OR REPLACE FUNCTION public.claim_call_quality_review(
  p_workspace_id UUID,
  p_call_id UUID,
  p_claim_token UUID,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  claimed BOOLEAN := FALSE;
BEGIN
  IF p_workspace_id IS NULL OR p_call_id IS NULL OR p_claim_token IS NULL THEN
    RAISE EXCEPTION 'Quality review claim identity is required';
  END IF;
  IF p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'Quality review lease must be between 30 and 900 seconds';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.calls AS call_row
    WHERE call_row.id = p_call_id
      AND call_row.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'Call does not belong to the requested workspace';
  END IF;

  INSERT INTO public.call_quality_reviews (
    workspace_id,
    call_id,
    status,
    provider,
    updated_at
  )
  VALUES (
    p_workspace_id,
    p_call_id,
    'pending',
    'unavailable',
    NOW()
  )
  ON CONFLICT (call_id) DO NOTHING;

  UPDATE public.call_quality_reviews AS review
  SET claim_token = p_claim_token,
      claim_expires_at = NOW() + make_interval(secs => p_lease_seconds),
      attempt_count = review.attempt_count + 1,
      updated_at = NOW()
  WHERE review.workspace_id = p_workspace_id
    AND review.call_id = p_call_id
    AND review.status = 'pending'
    AND (
      review.claim_token IS NULL
      OR review.claim_expires_at IS NULL
      OR review.claim_expires_at < NOW()
    )
  RETURNING TRUE INTO claimed;

  RETURN COALESCE(claimed, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_call_quality_review(UUID, UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_call_quality_review(UUID, UUID, UUID, INTEGER)
  TO service_role;
