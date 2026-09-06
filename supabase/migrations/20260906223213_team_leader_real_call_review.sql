CREATE TABLE public.call_review_revisions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  verdict TEXT NOT NULL CHECK (char_length(btrim(verdict)) BETWEEN 1 AND 200),
  coaching_note TEXT NOT NULL CHECK (char_length(btrim(coaching_note)) BETWEEN 3 AND 4000),
  correction_reason TEXT,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  supersedes_revision_id UUID REFERENCES public.call_review_revisions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT call_review_revisions_call_revision_unique UNIQUE (call_id, revision_number),
  CONSTRAINT call_review_revisions_correction_check CHECK (
    (
      revision_number = 1
      AND correction_reason IS NULL
      AND supersedes_revision_id IS NULL
    )
    OR
    (
      revision_number > 1
      AND char_length(btrim(correction_reason)) BETWEEN 3 AND 1000
      AND supersedes_revision_id IS NOT NULL
    )
  )
);

CREATE INDEX call_review_revisions_workspace_call_idx
  ON public.call_review_revisions (workspace_id, call_id, revision_number DESC);

CREATE INDEX call_review_revisions_reviewer_id_idx
  ON public.call_review_revisions (reviewer_id);

CREATE INDEX call_review_revisions_supersedes_revision_id_idx
  ON public.call_review_revisions (supersedes_revision_id)
  WHERE supersedes_revision_id IS NOT NULL;

ALTER TABLE public.call_review_revisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.call_review_revisions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.call_review_revisions TO authenticated;

CREATE POLICY "Workspace managers can view call review revisions"
  ON public.call_review_revisions
  FOR SELECT TO authenticated
  USING (private.is_workspace_manager_or_admin(workspace_id));

CREATE POLICY "Workspace managers can create call review revisions"
  ON public.call_review_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_workspace_manager_or_admin(workspace_id)
    AND reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.calls AS reviewed_call
      WHERE reviewed_call.id = call_id
        AND reviewed_call.workspace_id = workspace_id
    )
  );

CREATE OR REPLACE FUNCTION private.call_review_state(
  review_revision public.call_review_revisions
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', review_revision.id,
    'revision_number', review_revision.revision_number,
    'verdict', review_revision.verdict,
    'coaching_note', review_revision.coaching_note,
    'correction_reason', review_revision.correction_reason,
    'reviewer_id', review_revision.reviewer_id,
    'created_at', review_revision.created_at
  );
$$;

CREATE OR REPLACE FUNCTION private.prepare_call_review_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  call_workspace_id UUID;
  previous_revision public.call_review_revisions;
  expected_revision_number INTEGER;
BEGIN
  SELECT reviewed_call.workspace_id
    INTO call_workspace_id
  FROM public.calls AS reviewed_call
  WHERE reviewed_call.id = NEW.call_id;

  IF (SELECT auth.uid()) IS NULL
     OR call_workspace_id IS NULL
     OR NOT private.is_workspace_manager_or_admin(call_workspace_id) THEN
    RAISE EXCEPTION 'Team Leader or Administrator access is required';
  END IF;

  SELECT revision.*
    INTO previous_revision
  FROM public.call_review_revisions AS revision
  WHERE revision.call_id = NEW.call_id
  ORDER BY revision.revision_number DESC
  LIMIT 1;

  expected_revision_number := COALESCE(previous_revision.revision_number, 0) + 1;

  IF NEW.revision_number IS DISTINCT FROM expected_revision_number THEN
    RAISE EXCEPTION 'Review has changed; reload and try again';
  END IF;

  IF expected_revision_number = 1 THEN
    IF NEW.correction_reason IS NOT NULL OR NEW.supersedes_revision_id IS NOT NULL THEN
      RAISE EXCEPTION 'Initial review cannot contain a correction reason';
    END IF;
  ELSE
    IF NEW.correction_reason IS NULL
       OR char_length(btrim(NEW.correction_reason)) NOT BETWEEN 3 AND 1000 THEN
      RAISE EXCEPTION 'Correction reason must be between 3 and 1,000 characters';
    END IF;

    IF NEW.supersedes_revision_id IS DISTINCT FROM previous_revision.id THEN
      RAISE EXCEPTION 'Correction must supersede the latest review revision';
    END IF;
  END IF;

  NEW.workspace_id := call_workspace_id;
  NEW.reviewer_id := (SELECT auth.uid());
  NEW.verdict := btrim(NEW.verdict);
  NEW.coaching_note := btrim(NEW.coaching_note);
  NEW.correction_reason := NULLIF(btrim(NEW.correction_reason), '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER call_review_revisions_prepare
  BEFORE INSERT ON public.call_review_revisions
  FOR EACH ROW EXECUTE FUNCTION private.prepare_call_review_revision();

CREATE OR REPLACE FUNCTION private.audit_call_review_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  previous_revision public.call_review_revisions;
  previous_state JSONB := '{}'::jsonb;
  actor_name_value TEXT;
BEGIN
  IF NEW.supersedes_revision_id IS NOT NULL THEN
    SELECT revision.*
      INTO previous_revision
    FROM public.call_review_revisions AS revision
    WHERE revision.id = NEW.supersedes_revision_id;
    previous_state := private.call_review_state(previous_revision);
  END IF;

  SELECT NULLIF(btrim(profile.full_name), '')
    INTO actor_name_value
  FROM public.profiles AS profile
  WHERE profile.id = NEW.reviewer_id;

  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    actor_name,
    action,
    target_resource,
    details,
    severity,
    ip_address
  )
  VALUES (
    NEW.workspace_id,
    NEW.reviewer_id,
    COALESCE(actor_name_value, 'Unknown manager'),
    CASE
      WHEN NEW.revision_number = 1 THEN 'CALL_REVIEW_COMPLETED'
      ELSE 'CALL_REVIEW_CORRECTED'
    END,
    format('call:%s:review:%s', NEW.call_id, NEW.revision_number),
    jsonb_build_object(
      'previous', previous_state,
      'new', private.call_review_state(NEW),
      'correction_reason', NEW.correction_reason
    )::TEXT,
    'medium',
    '127.0.0.1'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER call_review_revisions_audit
  AFTER INSERT ON public.call_review_revisions
  FOR EACH ROW EXECUTE FUNCTION private.audit_call_review_revision();

CREATE OR REPLACE FUNCTION public.record_call_review_revision(
  p_call_id UUID,
  p_expected_revision INTEGER,
  p_verdict TEXT,
  p_coaching_note TEXT,
  p_correction_reason TEXT DEFAULT NULL
)
RETURNS SETOF public.call_review_revisions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  call_workspace_id UUID;
  previous_revision public.call_review_revisions;
  normalized_verdict TEXT := btrim(p_verdict);
  normalized_coaching_note TEXT := btrim(p_coaching_note);
  normalized_correction_reason TEXT := NULLIF(btrim(p_correction_reason), '');
  current_revision_number INTEGER;
BEGIN
  IF p_call_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'Call and expected revision are required';
  END IF;

  SELECT reviewed_call.workspace_id
    INTO call_workspace_id
  FROM public.calls AS reviewed_call
  WHERE reviewed_call.id = p_call_id;

  IF (SELECT auth.uid()) IS NULL
     OR call_workspace_id IS NULL
     OR NOT private.is_workspace_manager_or_admin(call_workspace_id) THEN
    RAISE EXCEPTION 'Team Leader or Administrator access is required';
  END IF;

  IF normalized_verdict IS NULL
     OR char_length(normalized_verdict) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Verdict must be between 1 and 200 characters';
  END IF;

  IF normalized_coaching_note IS NULL
     OR char_length(normalized_coaching_note) NOT BETWEEN 3 AND 4000 THEN
    RAISE EXCEPTION 'Coaching note must be between 3 and 4,000 characters';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_call_id::TEXT, 0)
  );

  SELECT revision.*
    INTO previous_revision
  FROM public.call_review_revisions AS revision
  WHERE revision.call_id = p_call_id
  ORDER BY revision.revision_number DESC
  LIMIT 1;

  current_revision_number := COALESCE(previous_revision.revision_number, 0);
  IF current_revision_number IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Review has changed; reload and try again';
  END IF;

  IF current_revision_number = 0 THEN
    IF normalized_correction_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Initial review cannot contain a correction reason';
    END IF;
  ELSIF normalized_correction_reason IS NULL
        OR char_length(normalized_correction_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'Correction reason must be between 3 and 1,000 characters';
  END IF;

  RETURN QUERY
  INSERT INTO public.call_review_revisions (
    workspace_id,
    call_id,
    revision_number,
    verdict,
    coaching_note,
    correction_reason,
    reviewer_id,
    supersedes_revision_id
  )
  VALUES (
    call_workspace_id,
    p_call_id,
    current_revision_number + 1,
    normalized_verdict,
    normalized_coaching_note,
    normalized_correction_reason,
    (SELECT auth.uid()),
    previous_revision.id
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION private.call_review_state(public.call_review_revisions)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.call_review_state(public.call_review_revisions)
  TO authenticated;

REVOKE ALL ON FUNCTION private.prepare_call_review_revision()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.prepare_call_review_revision()
  TO authenticated;

REVOKE ALL ON FUNCTION private.audit_call_review_revision()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.audit_call_review_revision()
  TO authenticated;

REVOKE ALL ON FUNCTION public.record_call_review_revision(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_call_review_revision(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO authenticated;

ALTER TABLE public.telephony_call_sessions
  ADD COLUMN completed_call_id UUID,
  ADD COLUMN script_source TEXT,
  ADD COLUMN script_product_id UUID,
  ADD COLUMN script_product_title TEXT,
  ADD COLUMN script_version_id UUID,
  ADD COLUMN script_version_number INTEGER,
  ADD COLUMN script_snapshot_html TEXT,
  ADD COLUMN script_captured_at TIMESTAMPTZ;

ALTER TABLE public.telephony_call_sessions
  ADD CONSTRAINT telephony_call_sessions_completed_call_id_fkey
    FOREIGN KEY (completed_call_id) REFERENCES public.calls(id) ON DELETE RESTRICT,
  ADD CONSTRAINT telephony_call_sessions_script_product_id_fkey
    FOREIGN KEY (script_product_id) REFERENCES public.products(id) ON DELETE RESTRICT,
  ADD CONSTRAINT telephony_call_sessions_script_version_id_fkey
    FOREIGN KEY (script_version_id) REFERENCES public.product_script_versions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT telephony_call_sessions_script_snapshot_check CHECK (
    (
      script_source IS NULL
      AND script_product_id IS NULL
      AND script_product_title IS NULL
      AND script_version_id IS NULL
      AND script_version_number IS NULL
      AND script_snapshot_html IS NULL
      AND script_captured_at IS NULL
    )
    OR
    (
      script_source = 'published_version'
      AND script_product_id IS NOT NULL
      AND NULLIF(btrim(script_product_title), '') IS NOT NULL
      AND script_version_id IS NOT NULL
      AND script_version_number > 0
      AND NULLIF(btrim(script_snapshot_html), '') IS NOT NULL
      AND script_captured_at IS NOT NULL
    )
    OR
    (
      script_source = 'built_in_fallback'
      AND script_product_id IS NOT NULL
      AND NULLIF(btrim(script_product_title), '') IS NOT NULL
      AND script_version_id IS NULL
      AND script_version_number IS NULL
      AND NULLIF(btrim(script_snapshot_html), '') IS NOT NULL
      AND script_captured_at IS NOT NULL
    )
    OR
    (
      script_source = 'unavailable'
      AND script_product_id IS NULL
      AND script_product_title IS NULL
      AND script_version_id IS NULL
      AND script_version_number IS NULL
      AND script_snapshot_html IS NULL
      AND script_captured_at IS NOT NULL
    )
  );

CREATE UNIQUE INDEX telephony_call_sessions_completed_call_id_key
  ON public.telephony_call_sessions (completed_call_id)
  WHERE completed_call_id IS NOT NULL;

CREATE INDEX telephony_call_sessions_script_product_id_idx
  ON public.telephony_call_sessions (script_product_id)
  WHERE script_product_id IS NOT NULL;

CREATE INDEX telephony_call_sessions_script_version_id_idx
  ON public.telephony_call_sessions (script_version_id)
  WHERE script_version_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.preserve_telephony_call_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.script_source IS DISTINCT FROM OLD.script_source
     OR NEW.script_product_id IS DISTINCT FROM OLD.script_product_id
     OR NEW.script_product_title IS DISTINCT FROM OLD.script_product_title
     OR NEW.script_version_id IS DISTINCT FROM OLD.script_version_id
     OR NEW.script_version_number IS DISTINCT FROM OLD.script_version_number
     OR NEW.script_snapshot_html IS DISTINCT FROM OLD.script_snapshot_html
     OR NEW.script_captured_at IS DISTINCT FROM OLD.script_captured_at THEN
    RAISE EXCEPTION 'Captured call script evidence cannot be changed';
  END IF;

  IF OLD.completed_call_id IS NOT NULL
     AND NEW.completed_call_id IS DISTINCT FROM OLD.completed_call_id THEN
    RAISE EXCEPTION 'Completed call link cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER telephony_call_sessions_preserve_evidence
  BEFORE UPDATE ON public.telephony_call_sessions
  FOR EACH ROW EXECUTE FUNCTION private.preserve_telephony_call_evidence();

CREATE OR REPLACE FUNCTION private.link_completed_call_to_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.call_id IS NULL OR NEW.call_id IS NOT DISTINCT FROM OLD.call_id THEN
    RETURN NEW;
  END IF;

  UPDATE public.telephony_call_sessions AS session
  SET completed_call_id = NEW.call_id
  WHERE session.id = NEW.completion_key
    AND session.workspace_id = NEW.workspace_id
    AND session.operator_id = NEW.actor_id
    AND (session.completed_call_id IS NULL OR session.completed_call_id = NEW.call_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completed call could not be linked to its telephony session';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER call_completion_requests_link_session
  AFTER UPDATE OF call_id ON public.call_completion_requests
  FOR EACH ROW EXECUTE FUNCTION private.link_completed_call_to_session();

UPDATE public.telephony_call_sessions AS session
SET completed_call_id = request.call_id
FROM public.call_completion_requests AS request
WHERE request.call_id IS NOT NULL
  AND request.completion_key = session.id
  AND request.workspace_id = session.workspace_id
  AND request.actor_id = session.operator_id
  AND session.completed_call_id IS NULL;

REVOKE ALL ON FUNCTION private.preserve_telephony_call_evidence()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.link_completed_call_to_session()
  FROM PUBLIC, anon;
