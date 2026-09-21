ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS feedback JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.training_sessions
SET feedback = CASE
  WHEN jsonb_typeof(scorecard) = 'array' THEN scorecard
  ELSE '[]'::jsonb
END
WHERE feedback = '[]'::jsonb AND scorecard IS NOT NULL;
