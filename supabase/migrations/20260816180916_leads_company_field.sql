-- Persist the company field already exposed by lead import and operator views.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company TEXT;
