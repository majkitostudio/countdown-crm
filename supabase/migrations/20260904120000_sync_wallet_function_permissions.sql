-- Restore the repository's manager/admin authorization boundary after the
-- historical administrator-only wallet governance migration was superseded.

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
