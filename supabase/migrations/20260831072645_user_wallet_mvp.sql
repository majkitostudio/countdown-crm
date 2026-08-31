-- Countdown CRM: immutable user wallet ledger and server-authoritative rewards.
--
-- The wallet intentionally stores signed transactions, not a mutable balance.
-- Delivery state is accepted only through the service-role fulfillment boundary
-- below. Authenticated users can read according to workspace role, while all
-- writes are performed by guarded RPCs or the order lifecycle trigger.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfillment_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_fulfillment_event_id_idx
  ON public.orders (fulfillment_event_id)
  WHERE fulfillment_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wallet_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'CZK'
    CHECK (currency IN ('CZK', 'EUR', 'PLN')),
  monthly_commission_rate NUMERIC(7, 4) NOT NULL DEFAULT 0
    CHECK (monthly_commission_rate >= 0 AND monthly_commission_rate <= 100),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_bonus_rules (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('CZK', 'EUR', 'PLN')),
  minimum_order_amount NUMERIC(12, 2) NOT NULL CHECK (minimum_order_amount > 0),
  bonus_amount NUMERIC(12, 2) NOT NULL CHECK (bonus_amount > 0),
  effective_from DATE NOT NULL DEFAULT current_date,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_bonus_rules_unique_version
    UNIQUE (workspace_id, currency, minimum_order_amount, effective_from)
);

CREATE INDEX IF NOT EXISTS wallet_bonus_rules_lookup_idx
  ON public.wallet_bonus_rules (
    workspace_id,
    currency,
    effective_from DESC,
    minimum_order_amount DESC
  );

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),
  currency TEXT NOT NULL CHECK (currency IN ('CZK', 'EUR', 'PLN')),
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('order_bonus', 'monthly_commission', 'manual_adjustment', 'reversal')
  ),
  source_type TEXT NOT NULL CHECK (
    source_type IN ('order', 'commission_period', 'manual')
  ),
  source_event_id TEXT NOT NULL CHECK (char_length(trim(source_event_id)) BETWEEN 1 AND 200),
  source_order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  source_period_start DATE,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 500),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  audit_log_id UUID REFERENCES public.audit_logs(id) ON DELETE SET NULL,
  rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_source_shape_check CHECK (
    (source_type = 'order' AND source_order_id IS NOT NULL)
    OR (source_type = 'commission_period' AND source_order_id IS NULL AND source_period_start IS NOT NULL)
    OR (source_type = 'manual' AND source_order_id IS NULL AND source_period_start IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_source_event_idx
  ON public.wallet_transactions (source_event_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_workspace_user_created_idx
  ON public.wallet_transactions (workspace_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_transactions_workspace_period_idx
  ON public.wallet_transactions (workspace_id, source_period_start);

CREATE OR REPLACE FUNCTION private.guard_wallet_transaction_immutability()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Wallet transactions are immutable';
END;
$$;

REVOKE ALL ON FUNCTION private.guard_wallet_transaction_immutability() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wallet_transactions_immutable ON public.wallet_transactions;
CREATE TRIGGER wallet_transactions_immutable
  BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_wallet_transaction_immutability();

ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_bonus_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view wallet settings" ON public.wallet_settings;
CREATE POLICY "Workspace members can view wallet settings"
  ON public.wallet_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members AS member
      WHERE member.workspace_id = wallet_settings.workspace_id
        AND member.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can view wallet bonus rules" ON public.wallet_bonus_rules;
CREATE POLICY "Workspace members can view wallet bonus rules"
  ON public.wallet_bonus_rules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members AS member
      WHERE member.workspace_id = wallet_bonus_rules.workspace_id
        AND member.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own or manager wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own or manager wallet transactions"
  ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_workspace_manager_or_admin(workspace_id)
  );

REVOKE ALL ON TABLE public.wallet_settings, public.wallet_bonus_rules, public.wallet_transactions
  FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.wallet_settings, public.wallet_bonus_rules, public.wallet_transactions
  TO authenticated;

-- New workspaces receive a safe zero-rate configuration and the agreed starter
-- thresholds. Rates remain zero until an administrator configures them.
CREATE OR REPLACE FUNCTION private.seed_wallet_defaults()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  INSERT INTO public.wallet_settings (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.wallet_bonus_rules (
    workspace_id, currency, minimum_order_amount, bonus_amount, effective_from
  )
  VALUES
    (NEW.id, 'CZK', 1800, 50, current_date),
    (NEW.id, 'CZK', 2800, 100, current_date),
    (NEW.id, 'CZK', 3500, 190, current_date),
    (NEW.id, 'CZK', 4100, 370, current_date),
    (NEW.id, 'CZK', 5700, 510, current_date)
  ON CONFLICT (workspace_id, currency, minimum_order_amount, effective_from) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.seed_wallet_defaults() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS workspaces_seed_wallet_defaults ON public.workspaces;
CREATE TRIGGER workspaces_seed_wallet_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION private.seed_wallet_defaults();

INSERT INTO public.wallet_settings (workspace_id)
SELECT workspace.id
FROM public.workspaces AS workspace
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO public.wallet_bonus_rules (
  workspace_id, currency, minimum_order_amount, bonus_amount, effective_from
)
SELECT workspace.id, 'CZK', starter.minimum_order_amount, starter.bonus_amount, current_date
FROM public.workspaces AS workspace
CROSS JOIN (
  VALUES
    (1800::NUMERIC, 50::NUMERIC),
    (2800::NUMERIC, 100::NUMERIC),
    (3500::NUMERIC, 190::NUMERIC),
    (4100::NUMERIC, 370::NUMERIC),
    (5700::NUMERIC, 510::NUMERIC)
) AS starter(minimum_order_amount, bonus_amount)
ON CONFLICT (workspace_id, currency, minimum_order_amount, effective_from) DO NOTHING;

-- A delivery provider calls this boundary with the service role. Authenticated
-- users have no EXECUTE privilege, and direct table changes to delivery states
-- are rejected by the trigger below.
CREATE OR REPLACE FUNCTION public.record_order_fulfillment_event(
  p_order_id UUID,
  p_status TEXT,
  p_event_id TEXT,
  p_occurred_at TIMESTAMPTZ DEFAULT now()
)
RETURNS public.orders
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  order_row public.orders;
  existing_event_id TEXT;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Fulfillment events require the service role';
  END IF;

  IF p_order_id IS NULL OR p_status NOT IN ('delivered', 'returned') THEN
    RAISE EXCEPTION 'A valid fulfillment order and status are required';
  END IF;
  IF p_event_id IS NULL OR char_length(trim(p_event_id)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'A fulfillment event id is required';
  END IF;
  IF p_occurred_at IS NULL THEN
    RAISE EXCEPTION 'A fulfillment event timestamp is required';
  END IF;

  SELECT * INTO order_row
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order is not available for fulfillment';
  END IF;

  existing_event_id := order_row.fulfillment_event_id;
  IF order_row.status = p_status AND existing_event_id = p_event_id THEN
    RETURN order_row;
  END IF;
  IF order_row.status IN ('delivered', 'returned') THEN
    RAISE EXCEPTION 'Order already has a terminal fulfillment status';
  END IF;
  IF p_status = 'returned' AND order_row.status <> 'delivered' THEN
    RAISE EXCEPTION 'Only a delivered order can be returned';
  END IF;

  PERFORM set_config('countdown.fulfillment_event_id', trim(p_event_id), true);
  IF p_status = 'delivered' THEN
    UPDATE public.orders
    SET status = 'delivered',
        delivered_at = p_occurred_at,
        fulfillment_event_id = trim(p_event_id)
    WHERE id = p_order_id
    RETURNING * INTO order_row;
  ELSE
    UPDATE public.orders
    SET status = 'returned',
        returned_at = p_occurred_at,
        fulfillment_event_id = trim(p_event_id)
    WHERE id = p_order_id
    RETURNING * INTO order_row;
  END IF;

  RETURN order_row;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_fulfillment_event(UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_fulfillment_event(UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

CREATE OR REPLACE FUNCTION private.guard_order_fulfillment_status()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('delivered', 'returned')
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NULLIF(current_setting('countdown.fulfillment_event_id', true), '') IS NULL
  THEN
    RAISE EXCEPTION 'Delivery status is system-controlled';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_order_fulfillment_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_guard_fulfillment_status ON public.orders;
CREATE TRIGGER orders_guard_fulfillment_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_order_fulfillment_status();

CREATE OR REPLACE FUNCTION private.post_wallet_order_reward()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  settings_row public.wallet_settings;
  bonus_rule public.wallet_bonus_rules;
  original_bonus public.wallet_transactions;
  commission_row public.wallet_transactions;
  audit_id UUID;
  reward_event_id TEXT;
  reversal_amount NUMERIC;
  delivery_event_id TEXT := NULLIF(current_setting('countdown.fulfillment_event_id', true), '');
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.agent_id IS NULL OR NEW.workspace_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO settings_row
    FROM public.wallet_settings
    WHERE workspace_id = NEW.workspace_id;

    IF settings_row.workspace_id IS NULL OR upper(NEW.currency) <> settings_row.currency THEN
      RETURN NEW;
    END IF;

    SELECT * INTO bonus_rule
    FROM public.wallet_bonus_rules
    WHERE workspace_id = NEW.workspace_id
      AND currency = settings_row.currency
      AND minimum_order_amount <= NEW.total_amount
      AND effective_from <= coalesce(NEW.delivered_at::DATE, current_date)
    ORDER BY effective_from DESC, minimum_order_amount DESC
    LIMIT 1;

    IF bonus_rule.id IS NULL THEN
      RETURN NEW;
    END IF;

    reward_event_id := 'order-bonus:' || NEW.id::TEXT;
    INSERT INTO public.audit_logs (
      workspace_id, actor_id, actor_name, action, target_resource,
      details, severity, ip_address
    )
    VALUES (
      NEW.workspace_id, 'system', 'Fulfillment system', 'WALLET_ORDER_BONUS_POSTED',
      'Wallet transaction',
      format('Order %s delivered; bonus %s %s posted for operator %s.', NEW.id, bonus_rule.bonus_amount, settings_row.currency, NEW.agent_id),
      'low', 'server'
    )
    RETURNING id INTO audit_id;

    INSERT INTO public.wallet_transactions (
      workspace_id, user_id, amount, currency, transaction_type, source_type,
      source_event_id, source_order_id, reason, author_id, audit_log_id, rule_snapshot
    )
    VALUES (
      NEW.workspace_id, NEW.agent_id, bonus_rule.bonus_amount, settings_row.currency,
      'order_bonus', 'order', reward_event_id, NEW.id,
      format('Delivered order bonus for order %s.', NEW.id), NULL, audit_id,
      jsonb_build_object(
        'minimum_order_amount', bonus_rule.minimum_order_amount,
        'bonus_amount', bonus_rule.bonus_amount,
        'effective_from', bonus_rule.effective_from,
        'fulfillment_event_id', delivery_event_id
      )
    )
    ON CONFLICT (source_event_id) DO NOTHING;
  ELSIF NEW.status = 'returned' AND OLD.status = 'delivered' THEN
    SELECT * INTO original_bonus
    FROM public.wallet_transactions
    WHERE source_order_id = NEW.id
      AND transaction_type = 'order_bonus'
      AND amount > 0
    ORDER BY created_at DESC
    LIMIT 1;

    IF original_bonus.id IS NOT NULL THEN
      INSERT INTO public.audit_logs (
        workspace_id, actor_id, actor_name, action, target_resource,
        details, severity, ip_address
      )
      VALUES (
        NEW.workspace_id, 'system', 'Fulfillment system', 'WALLET_ORDER_BONUS_REVERSED',
        'Wallet transaction',
        format('Returned order %s; bonus %s %s reversed.', NEW.id, original_bonus.amount, original_bonus.currency),
        'medium', 'server'
      )
      RETURNING id INTO audit_id;

      INSERT INTO public.wallet_transactions (
        workspace_id, user_id, amount, currency, transaction_type, source_type,
        source_event_id, source_order_id, reason, author_id, audit_log_id, rule_snapshot
      )
      VALUES (
        NEW.workspace_id, original_bonus.user_id, -original_bonus.amount, original_bonus.currency,
        'reversal', 'order', 'order-bonus-reversal:' || NEW.id::TEXT, NEW.id,
        format('Reversal of delivered order bonus for returned order %s.', NEW.id), NULL, audit_id,
        jsonb_build_object('reverses_transaction_id', original_bonus.id, 'fulfillment_event_id', delivery_event_id)
      )
      ON CONFLICT (source_event_id) DO NOTHING;
    END IF;

    -- A return after month close also reverses this order's snapshot share of
    -- the already-posted monthly commission. Returns before close are excluded
    -- from the monthly aggregate and therefore need no commission reversal.
    SELECT * INTO commission_row
    FROM public.wallet_transactions
    WHERE source_period_start = date_trunc('month', NEW.delivered_at)::DATE
      AND user_id = NEW.agent_id
      AND transaction_type = 'monthly_commission'
      AND amount > 0
    ORDER BY created_at DESC
    LIMIT 1;

    IF commission_row.id IS NOT NULL THEN
      reversal_amount := round(
        NEW.total_amount * coalesce((commission_row.rule_snapshot ->> 'commission_rate')::NUMERIC, 0) / 100,
        2
      );
      IF reversal_amount > 0 THEN
        INSERT INTO public.audit_logs (
          workspace_id, actor_id, actor_name, action, target_resource,
          details, severity, ip_address
        )
        VALUES (
          NEW.workspace_id, 'system', 'Fulfillment system', 'WALLET_COMMISSION_REVERSED',
          'Wallet transaction',
          format('Returned order %s; monthly commission share %s %s reversed.', NEW.id, reversal_amount, commission_row.currency),
          'medium', 'server'
        )
        RETURNING id INTO audit_id;

        INSERT INTO public.wallet_transactions (
          workspace_id, user_id, amount, currency, transaction_type, source_type,
          source_event_id, source_order_id, source_period_start, reason,
          author_id, audit_log_id, rule_snapshot
        )
        VALUES (
          NEW.workspace_id, commission_row.user_id, -reversal_amount, commission_row.currency,
          'reversal', 'order', 'monthly-commission-reversal:' || NEW.id::TEXT, NEW.id,
          commission_row.source_period_start,
          format('Reversal of monthly commission share for returned order %s.', NEW.id),
          NULL, audit_id,
          jsonb_build_object('reverses_transaction_id', commission_row.id, 'commission_rate', commission_row.rule_snapshot ->> 'commission_rate')
        )
        ON CONFLICT (source_event_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.post_wallet_order_reward() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_post_wallet_reward ON public.orders;
CREATE TRIGGER orders_post_wallet_reward
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION private.post_wallet_order_reward();

CREATE OR REPLACE FUNCTION public.finalize_wallet_monthly_commission(
  p_workspace_id UUID,
  p_user_id UUID,
  p_period_start DATE
)
RETURNS public.wallet_transactions
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  settings_row public.wallet_settings;
  member_exists BOOLEAN;
  delivered_total NUMERIC;
  commission_amount NUMERIC;
  transaction_row public.wallet_transactions;
  audit_id UUID;
  period_end DATE;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Monthly commission finalization requires the service role';
  END IF;
  IF p_workspace_id IS NULL OR p_user_id IS NULL OR p_period_start IS NULL
     OR p_period_start <> date_trunc('month', p_period_start)::DATE
  THEN
    RAISE EXCEPTION 'Workspace, member and first day of month are required';
  END IF;
  IF p_period_start >= date_trunc('month', now())::DATE THEN
    RAISE EXCEPTION 'Only completed months can be finalized';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) INTO member_exists;
  IF NOT member_exists THEN
    RAISE EXCEPTION 'The wallet member is not in the workspace';
  END IF;

  SELECT * INTO settings_row
  FROM public.wallet_settings
  WHERE workspace_id = p_workspace_id;
  IF settings_row.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Wallet settings are not configured for the workspace';
  END IF;

  period_end := (p_period_start + INTERVAL '1 month')::DATE;
  SELECT coalesce(sum(order_row.total_amount), 0)
  INTO delivered_total
  FROM public.orders AS order_row
  WHERE order_row.workspace_id = p_workspace_id
    AND order_row.agent_id = p_user_id
    AND order_row.status = 'delivered'
    AND upper(order_row.currency) = settings_row.currency
    AND order_row.delivered_at >= p_period_start::TIMESTAMPTZ
    AND order_row.delivered_at < period_end::TIMESTAMPTZ;

  commission_amount := round(delivered_total * settings_row.monthly_commission_rate / 100, 2);
  IF commission_amount <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO transaction_row
  FROM public.wallet_transactions
  WHERE source_event_id = format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start);
  IF transaction_row.id IS NOT NULL THEN
    RETURN transaction_row;
  END IF;

  INSERT INTO public.audit_logs (
    workspace_id, actor_id, actor_name, action, target_resource,
    details, severity, ip_address
  )
  VALUES (
    p_workspace_id, 'system', 'Wallet settlement system', 'WALLET_MONTHLY_COMMISSION_POSTED',
    'Wallet transaction',
    format('Monthly commission %s %s posted for %s on delivered total %s %s.', commission_amount, settings_row.currency, p_user_id, delivered_total, settings_row.currency),
    'low', 'server'
  )
  RETURNING id INTO audit_id;

  INSERT INTO public.wallet_transactions (
    workspace_id, user_id, amount, currency, transaction_type, source_type,
    source_event_id, source_period_start, reason, author_id, audit_log_id, rule_snapshot
  )
  VALUES (
    p_workspace_id, p_user_id, commission_amount, settings_row.currency,
    'monthly_commission', 'commission_period',
    format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start),
    p_period_start,
    format('Monthly commission for %s %s delivered total.', to_char(p_period_start, 'YYYY-MM'), delivered_total),
    NULL, audit_id,
    jsonb_build_object(
      'delivered_total', delivered_total,
      'commission_rate', settings_row.monthly_commission_rate,
      'currency', settings_row.currency
    )
  )
  ON CONFLICT (source_event_id) DO NOTHING
  RETURNING * INTO transaction_row;

  IF transaction_row.id IS NULL THEN
    SELECT * INTO transaction_row
    FROM public.wallet_transactions
    WHERE source_event_id = format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start);
  END IF;
  RETURN transaction_row;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_wallet_monthly_commission(UUID, UUID, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_wallet_monthly_commission(UUID, UUID, DATE)
  TO service_role;

CREATE OR REPLACE FUNCTION public.update_wallet_settings(
  p_workspace_id UUID,
  p_currency TEXT,
  p_monthly_commission_rate NUMERIC
)
RETURNS public.wallet_settings
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  settings_row public.wallet_settings;
  has_other_currency BOOLEAN;
BEGIN
  IF current_user_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Insufficient workspace permissions';
  END IF;
  IF p_currency NOT IN ('CZK', 'EUR', 'PLN') THEN
    RAISE EXCEPTION 'Unsupported wallet currency';
  END IF;
  IF p_monthly_commission_rate IS NULL OR p_monthly_commission_rate < 0 OR p_monthly_commission_rate > 100 THEN
    RAISE EXCEPTION 'Monthly commission rate must be between 0 and 100';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE workspace_id = p_workspace_id
      AND currency <> p_currency
  ) INTO has_other_currency;
  IF has_other_currency THEN
    RAISE EXCEPTION 'Wallet currency cannot change after transactions exist in another currency';
  END IF;

  INSERT INTO public.wallet_settings (workspace_id, currency, monthly_commission_rate, updated_by)
  VALUES (p_workspace_id, p_currency, round(p_monthly_commission_rate, 4), current_user_id)
  ON CONFLICT (workspace_id) DO UPDATE
  SET currency = EXCLUDED.currency,
      monthly_commission_rate = EXCLUDED.monthly_commission_rate,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
  RETURNING * INTO settings_row;
  RETURN settings_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_wallet_settings(UUID, TEXT, NUMERIC)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_wallet_settings(UUID, TEXT, NUMERIC)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.add_wallet_bonus_rule(
  p_workspace_id UUID,
  p_currency TEXT,
  p_minimum_order_amount NUMERIC,
  p_bonus_amount NUMERIC,
  p_effective_from DATE DEFAULT current_date
)
RETURNS public.wallet_bonus_rules
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  rule_row public.wallet_bonus_rules;
BEGIN
  IF current_user_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Insufficient workspace permissions';
  END IF;
  IF p_currency NOT IN ('CZK', 'EUR', 'PLN') THEN
    RAISE EXCEPTION 'Unsupported wallet currency';
  END IF;
  IF p_minimum_order_amount IS NULL OR p_minimum_order_amount <= 0
     OR p_bonus_amount IS NULL OR p_bonus_amount <= 0
  THEN
    RAISE EXCEPTION 'Minimum order and bonus amounts must be positive';
  END IF;
  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'Rule effective date is required';
  END IF;

  INSERT INTO public.wallet_bonus_rules (
    workspace_id, currency, minimum_order_amount, bonus_amount, effective_from, created_by
  )
  VALUES (
    p_workspace_id, p_currency, round(p_minimum_order_amount, 2), round(p_bonus_amount, 2), p_effective_from, current_user_id
  )
  RETURNING * INTO rule_row;
  RETURN rule_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A bonus rule with this threshold and effective date already exists';
END;
$$;

REVOKE ALL ON FUNCTION public.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_wallet_bonus_rule(UUID, TEXT, NUMERIC, NUMERIC, DATE)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.add_wallet_manual_adjustment(
  p_workspace_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
)
RETURNS public.wallet_transactions
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  settings_row public.wallet_settings;
  target_exists BOOLEAN;
  actor_name TEXT;
  audit_id UUID;
  transaction_row public.wallet_transactions;
  source_event_id TEXT := 'manual-wallet:' || extensions.uuid_generate_v4()::TEXT;
BEGIN
  IF current_user_id IS NULL OR NOT private.is_workspace_manager_or_admin(p_workspace_id) THEN
    RAISE EXCEPTION 'Insufficient workspace permissions';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 OR abs(p_amount) > 1000000000 THEN
    RAISE EXCEPTION 'Wallet adjustment must be non-zero and within the allowed range';
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'A reason between 1 and 500 characters is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) INTO target_exists;
  IF NOT target_exists THEN
    RAISE EXCEPTION 'The wallet member is not in the workspace';
  END IF;

  SELECT * INTO settings_row
  FROM public.wallet_settings
  WHERE workspace_id = p_workspace_id;
  IF settings_row.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Wallet settings are not configured for the workspace';
  END IF;

  SELECT full_name INTO actor_name
  FROM public.profiles
  WHERE id = current_user_id;

  INSERT INTO public.audit_logs (
    workspace_id, actor_id, actor_name, action, target_resource,
    details, severity, ip_address
  )
  VALUES (
    p_workspace_id, current_user_id::TEXT, coalesce(actor_name, 'Workspace manager'),
    'WALLET_MANUAL_ADJUSTMENT', 'Wallet transaction',
    format('Manual wallet adjustment %s %s for %s: %s', p_amount, settings_row.currency, p_user_id, trim(p_reason)),
    CASE WHEN p_amount < 0 THEN 'medium' ELSE 'low' END, 'server'
  )
  RETURNING id INTO audit_id;

  INSERT INTO public.wallet_transactions (
    workspace_id, user_id, amount, currency, transaction_type, source_type,
    source_event_id, reason, author_id, audit_log_id, rule_snapshot
  )
  VALUES (
    p_workspace_id, p_user_id, round(p_amount, 2), settings_row.currency,
    'manual_adjustment', 'manual', source_event_id, trim(p_reason),
    current_user_id, audit_id, jsonb_build_object('manual', true)
  )
  RETURNING * INTO transaction_row;
  RETURN transaction_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_wallet_manual_adjustment(UUID, UUID, NUMERIC, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_wallet_balances(p_workspace_id UUID)
RETURNS TABLE (
  user_id UUID,
  transaction_count BIGINT,
  balance NUMERIC,
  total_credits NUMERIC,
  total_debits NUMERIC
)
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT
    transaction_row.user_id,
    count(*)::BIGINT,
    coalesce(sum(transaction_row.amount), 0),
    coalesce(sum(transaction_row.amount) FILTER (WHERE transaction_row.amount > 0), 0),
    coalesce(sum(abs(transaction_row.amount)) FILTER (WHERE transaction_row.amount < 0), 0)
  FROM public.wallet_transactions AS transaction_row
  WHERE transaction_row.workspace_id = p_workspace_id
    AND (
      transaction_row.user_id = (SELECT auth.uid())
      OR private.is_workspace_manager_or_admin(p_workspace_id)
    )
  GROUP BY transaction_row.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_wallet_balances(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balances(UUID) TO authenticated;
