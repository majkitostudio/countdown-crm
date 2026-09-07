-- Keep the stable public RPC signatures used by PostgREST, but execute those
-- API entry points as the caller. The existing privileged implementations are
-- moved into the non-exposed private schema and retain their explicit
-- auth.uid(), workspace and role checks.

ALTER FUNCTION public.update_wallet_settings(UUID, TEXT, NUMERIC)
  SET SCHEMA private;
ALTER FUNCTION public.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  SET SCHEMA private;
ALTER FUNCTION public.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  SET SCHEMA private;
ALTER FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) SET SCHEMA private;
ALTER FUNCTION public.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) SET SCHEMA private;

ALTER FUNCTION private.update_wallet_settings(UUID, TEXT, NUMERIC)
  SET search_path = '';
ALTER FUNCTION private.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  SET search_path = '';
ALTER FUNCTION private.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  SET search_path = '';
ALTER FUNCTION private.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) SET search_path = '';
ALTER FUNCTION private.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) SET search_path = '';

REVOKE ALL ON FUNCTION private.update_wallet_settings(UUID, TEXT, NUMERIC)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.update_wallet_settings(UUID, TEXT, NUMERIC)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated, service_role;

CREATE FUNCTION public.update_wallet_settings(
  p_workspace_id UUID,
  p_currency TEXT,
  p_monthly_commission_rate NUMERIC
)
RETURNS public.wallet_settings
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.update_wallet_settings($1, $2, $3);
$$;

CREATE FUNCTION public.add_wallet_bonus_rule(
  p_workspace_id UUID,
  p_currency TEXT,
  p_minimum_order_amount NUMERIC,
  p_bonus_amount NUMERIC,
  p_effective_from DATE DEFAULT current_date
)
RETURNS public.wallet_bonus_rules
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.add_wallet_bonus_rule($1, $2, $3, $4, $5);
$$;

CREATE FUNCTION public.add_wallet_manual_adjustment(
  p_workspace_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
)
RETURNS public.wallet_transactions
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.add_wallet_manual_adjustment($1, $2, $3, $4);
$$;

CREATE FUNCTION public.complete_lead_call_with_order_items_idempotent(
  completion_key UUID,
  target_queue_item_id UUID,
  call_session_id UUID,
  call_duration_seconds INTEGER,
  call_outcome TEXT,
  call_transcript TEXT,
  call_ai_sentiment TEXT,
  order_items JSONB DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  call_note TEXT DEFAULT NULL,
  call_fail_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.complete_lead_call_with_order_items_idempotent(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
  );
$$;

CREATE FUNCTION public.complete_call_with_order_items_idempotent(
  completion_key UUID,
  call_session_id UUID,
  lead_id UUID,
  duration_seconds INTEGER,
  outcome TEXT,
  transcript TEXT,
  ai_sentiment TEXT,
  order_items JSONB DEFAULT NULL,
  callback_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  call_note TEXT DEFAULT NULL,
  call_fail_reason TEXT DEFAULT NULL
)
RETURNS TABLE (call_id UUID, order_id UUID, lead_status TEXT)
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.complete_call_with_order_items_idempotent(
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
  );
$$;

REVOKE ALL ON FUNCTION public.update_wallet_settings(UUID, TEXT, NUMERIC)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.update_wallet_settings(UUID, TEXT, NUMERIC)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_lead_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order_items_idempotent(
  UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated, service_role;
