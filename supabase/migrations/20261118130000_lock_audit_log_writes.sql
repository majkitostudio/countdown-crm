-- Audit rows are evidence, not user-entered data. Authenticated workspace
-- members must not be able to insert, rewrite, or delete them directly.
--
-- Removing the INSERT policy alone would break legitimate writers: several
-- RPCs and AFTER INSERT triggers used to insert audit rows with the caller's
-- privileges. Those writers are switched to SECURITY DEFINER here so the
-- business change and its audit row still commit or roll back together.
--
-- Existing rows are kept as they are. They are historical records created
-- before this boundary existed and must not be presented as retroactively
-- verified.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM authenticated, anon;
DROP POLICY IF EXISTS "Workspace members can create audit logs" ON public.audit_logs;

-- Public mutation RPCs already perform explicit identity, role, and workspace
-- checks before touching business rows. They now execute as their owner so the
-- paired audit insert no longer depends on a caller table grant.
ALTER FUNCTION public.update_lead_status_with_audit(UUID, UUID, TEXT)
  SECURITY DEFINER;
ALTER FUNCTION public.update_lead_status_with_audit(UUID, UUID, TEXT)
  SET search_path = '';

ALTER FUNCTION public.reassign_orders_product_with_audit(UUID, UUID, UUID)
  SECURITY DEFINER;
ALTER FUNCTION public.reassign_orders_product_with_audit(UUID, UUID, UUID)
  SET search_path = '';

ALTER FUNCTION public.update_order_status_with_history(UUID, TEXT, TEXT)
  SECURITY DEFINER;
ALTER FUNCTION public.update_order_status_with_history(UUID, TEXT, TEXT)
  SET search_path = '';

ALTER FUNCTION public.update_order_with_items(UUID, INTEGER, JSONB, TEXT, TEXT, TEXT)
  SECURITY DEFINER;
ALTER FUNCTION public.update_order_with_items(UUID, INTEGER, JSONB, TEXT, TEXT, TEXT)
  SET search_path = '';

-- These triggers only append the audit row for an already authorized business
-- insert. They never change the business row itself.
ALTER FUNCTION private.audit_team_leader_exception_action()
  SECURITY DEFINER;
ALTER FUNCTION private.audit_team_leader_exception_action()
  SET search_path = '';

ALTER FUNCTION private.audit_call_review_revision()
  SECURITY DEFINER;
ALTER FUNCTION private.audit_call_review_revision()
  SET search_path = '';

CREATE OR REPLACE FUNCTION private.audit_call_insert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := COALESCE((SELECT auth.uid()), NEW.agent_id);
  actor_name TEXT;
BEGIN
  SELECT NULLIF(btrim(profile.full_name), '')
  INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = actor_id;

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
    COALESCE(actor_id::TEXT, 'system'),
    COALESCE(actor_name, 'Unknown operator'),
    'CALL_COMPLETED',
    'Call',
    format('Call %s completed for lead %s with outcome %s', NEW.id, NEW.lead_id, NEW.outcome),
    'low',
    'server'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.audit_call_order_insert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := COALESCE((SELECT auth.uid()), NEW.agent_id);
  actor_name TEXT;
BEGIN
  IF NEW.order_source = 'previous_call' THEN
    SELECT NULLIF(btrim(profile.full_name), '')
    INTO actor_name
    FROM public.profiles AS profile
    WHERE profile.id = actor_id;

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
      COALESCE(actor_id::TEXT, 'system'),
      COALESCE(actor_name, 'Unknown operator'),
      'ORDER_CREATED_FROM_CALL',
      'Order',
      format('Order %s created from a completed call for lead %s', NEW.id, NEW.lead_id),
      'low',
      'server'
    );
  END IF;

  RETURN NEW;
END;
$$;
