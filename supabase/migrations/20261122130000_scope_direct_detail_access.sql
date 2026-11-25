-- Direct detail reads follow workspace roles, team scope and assignments.
CREATE OR REPLACE FUNCTION private.can_view_direct_workspace_order(target_workspace_id uuid, target_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT private.can_list_order(target_workspace_id, target_order_id);
$function$;

CREATE OR REPLACE FUNCTION private.can_view_direct_workspace_call_review(target_workspace_id uuid, target_call_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.calls AS c
    WHERE c.id = target_call_id AND c.workspace_id = target_workspace_id
      AND (
        private.can_manage_team_resource(c.workspace_id, c.team_id)
        OR (c.agent_id = (SELECT auth.uid()) AND private.is_workspace_member(c.workspace_id))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_view_direct_workspace_lead(target_workspace_id uuid, target_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.leads AS l
    WHERE l.id = target_lead_id AND l.workspace_id = target_workspace_id
      AND (
        private.can_manage_team_resource(l.workspace_id, l.team_id)
        OR (
          private.is_workspace_member(l.workspace_id)
          AND EXISTS (
            SELECT 1 FROM public.lead_queue_items AS q
            WHERE q.workspace_id = l.workspace_id AND q.lead_id = l.id
              AND q.assigned_operator_id = (SELECT auth.uid())
              AND q.state IN ('assigned', 'in_progress', 'awaiting_outcome')
          )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.get_workspace_call_review_detail(target_call_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  WITH target AS (
    SELECT
      call_row.*,
      lead_row.full_name AS lead_name,
      operator_profile.full_name AS operator_name
    FROM public.calls AS call_row
    LEFT JOIN public.leads AS lead_row
      ON lead_row.id = call_row.lead_id
     AND lead_row.workspace_id = call_row.workspace_id
    LEFT JOIN public.profiles AS operator_profile
      ON operator_profile.id = call_row.agent_id
    WHERE call_row.id = target_call_id
      AND private.can_view_direct_workspace_call_review(call_row.workspace_id, call_row.id)
  )
  SELECT jsonb_build_object(
    'call', jsonb_build_object(
      'id', target.id,
      'workspace_id', target.workspace_id,
      'lead_id', target.lead_id,
      'agent_id', target.agent_id,
      'duration_seconds', target.duration_seconds,
      'outcome', target.outcome,
      'fail_reason', target.fail_reason,
      'operator_note', target.operator_note,
      'scheduled_at', target.scheduled_at,
      'transcript', target.transcript,
      'created_at', target.created_at
    ),
    'customer', CASE WHEN target.lead_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', target.lead_id,
      'name', target.lead_name
    ) END,
    'operator', CASE WHEN target.agent_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', target.agent_id,
      'name', target.operator_name
    ) END,
    'session', (
      SELECT jsonb_build_object(
        'provider', session.provider,
        'script_source', session.script_source,
        'script_product_id', session.script_product_id,
        'script_product_title', session.script_product_title,
        'script_version_id', session.script_version_id,
        'script_version_number', session.script_version_number,
        'script_snapshot_html', session.script_snapshot_html,
        'script_captured_at', session.script_captured_at
      )
      FROM public.telephony_call_sessions AS session
      WHERE session.completed_call_id = target.id
        AND session.workspace_id = target.workspace_id
      LIMIT 1
    ),
    'revisions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', revision.id,
        'call_id', revision.call_id,
        'revision_number', revision.revision_number,
        'verdict', revision.verdict,
        'coaching_note', revision.coaching_note,
        'correction_reason', revision.correction_reason,
        'reviewer_id', revision.reviewer_id,
        'reviewer_name', reviewer.full_name,
        'supersedes_revision_id', revision.supersedes_revision_id,
        'created_at', revision.created_at
      ) ORDER BY revision.revision_number ASC)
      FROM public.call_review_revisions AS revision
      LEFT JOIN public.profiles AS reviewer
        ON reviewer.id = revision.reviewer_id
      WHERE revision.call_id = target.id
        AND revision.workspace_id = target.workspace_id
        AND private.can_access_call_review(target.workspace_id, target.id)
    ), '[]'::jsonb),
    'can_review', private.can_access_call_review(target.workspace_id, target.id)
  )
  FROM target;
$function$;
