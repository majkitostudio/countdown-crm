-- Cover the lead_notes foreign keys for workspace and profile lookups.
CREATE INDEX IF NOT EXISTS lead_notes_lead_id_idx
  ON public.lead_notes (lead_id);

CREATE INDEX IF NOT EXISTS lead_notes_author_id_idx
  ON public.lead_notes (author_id);
