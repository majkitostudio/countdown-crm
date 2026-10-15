-- Countdown CRM: a lead that nobody queued is a lead nobody will ever call.
--
-- Until now the only code that created a lead queue item was the one-time
-- backfill in 20260819090000_lead_queue_assignment.sql. Every lead created
-- afterwards -- manual entry, CSV import and any future API/webhook intake --
-- never entered a queue: Operators and Team Leaders could not see it, and the
-- P3/P4 lifecycle routing (orders_lifecycle_department_routing) silently did
-- nothing, because it only moves leads that already have a queue item.
--
-- This migration ties the queue item to the lead itself, so no intake path can
-- forget it:
--   * every new lead gets exactly one queue item,
--   * the item inherits the lead's team, so a teamless import stays with the
--     Administrator until ownership is confirmed
--     (see 20261015090000_team_ownership_queue_cascade.sql),
--   * an already closed lead (customer/unresponsive) is queued as closed,
--   * leads created after the original backfill are filled once, right here.
--
-- Queue state is never rewritten afterwards. Closing the item stays in the
-- post-call flow and ownership stays in the ownership flow, so this trigger
-- only ever inserts an item that does not exist yet.

CREATE OR REPLACE FUNCTION private.enqueue_lead_queue_item()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  queue_state TEXT := CASE
    WHEN NEW.status IN ('customer', 'unresponsive') THEN 'closed'
    ELSE 'available'
  END;
BEGIN
  INSERT INTO public.lead_queue_items (
    workspace_id,
    lead_id,
    team_id,
    state,
    available_at,
    completed_at
  ) VALUES (
    NEW.workspace_id,
    NEW.id,
    NEW.team_id,
    queue_state,
    NOW(),
    CASE WHEN queue_state = 'closed' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (workspace_id, lead_id) DO NOTHING;

  RETURN NULL;
END;
$$;

-- The trigger function is not a client entry point; only the trigger calls it.
REVOKE ALL ON FUNCTION private.enqueue_lead_queue_item()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS leads_enqueue_queue_item ON public.leads;
CREATE TRIGGER leads_enqueue_queue_item
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION private.enqueue_lead_queue_item();

-- One-off cleanup for the leads that were created after the original backfill
-- and therefore never reached a queue. From now on the trigger above handles
-- this, so the statement is idempotent and safe to keep re-running.
INSERT INTO public.lead_queue_items (workspace_id, lead_id, team_id, state, available_at, completed_at)
SELECT
  lead.workspace_id,
  lead.id,
  lead.team_id,
  CASE WHEN lead.status IN ('customer', 'unresponsive') THEN 'closed' ELSE 'available' END,
  NOW(),
  CASE WHEN lead.status IN ('customer', 'unresponsive') THEN NOW() ELSE NULL END
FROM public.leads AS lead
WHERE lead.workspace_id IS NOT NULL
ON CONFLICT (workspace_id, lead_id) DO NOTHING;
