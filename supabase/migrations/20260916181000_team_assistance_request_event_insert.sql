-- Operators may append the audit event for their own newly-created request.
-- Manager claim/resolve events are written by the protected RPC functions.
GRANT INSERT ON TABLE public.team_assistance_request_events TO authenticated;

CREATE POLICY "Participants can create assistance request events"
  ON public.team_assistance_request_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
    AND (
      private.is_workspace_manager_or_admin(workspace_id)
      OR EXISTS (
        SELECT 1
        FROM public.team_assistance_requests AS request
        WHERE request.id = team_assistance_request_events.request_id
          AND request.workspace_id = team_assistance_request_events.workspace_id
          AND request.operator_id = (SELECT auth.uid())
          AND team_assistance_request_events.event_type = 'requested'
          AND team_assistance_request_events.from_status IS NULL
          AND team_assistance_request_events.to_status = 'open'
      )
    )
  );
