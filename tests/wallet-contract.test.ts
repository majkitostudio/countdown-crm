import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260831072645_user_wallet_mvp.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const rlsMigration = readFileSync(
  new URL("../supabase/migrations/20260902160000_wallet_settings_manager_rls.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

const walletDal = readFileSync(new URL("../src/lib/dal/wallet.ts", import.meta.url), "utf8");
const walletPage = readFileSync(new URL("../src/app/wallet/page.tsx", import.meta.url), "utf8");
const settingsPage = readFileSync(new URL("../src/app/settings/page.tsx", import.meta.url), "utf8");

describe("user wallet MVP contract", () => {
  it("keeps the wallet as an immutable, workspace-scoped ledger", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.wallet_transactions");
    expect(migration).toContain("CHECK (amount <> 0)");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_source_event_idx ON public.wallet_transactions (source_event_id)");
    expect(migration).toContain("CREATE TRIGGER wallet_transactions_immutable BEFORE UPDATE OR DELETE ON public.wallet_transactions");
    expect(migration).toContain("RAISE EXCEPTION 'Wallet transactions are immutable'");
    expect(migration).toContain("Wallet currency cannot change after transactions exist in another currency");
    expect(migration).toContain("ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("user_id = (SELECT auth.uid()) OR private.is_workspace_manager_or_admin(workspace_id)");
    expect(migration).toContain("REVOKE ALL ON TABLE public.wallet_settings, public.wallet_bonus_rules, public.wallet_transactions FROM PUBLIC, anon");
    expect(migration).toContain("GRANT SELECT ON TABLE public.wallet_settings, public.wallet_bonus_rules, public.wallet_transactions TO authenticated");
  });

  it("protects fulfillment transitions and idempotent reward posting", () => {
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.record_order_fulfillment_event(UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.record_order_fulfillment_event(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("RAISE EXCEPTION 'Delivery status is system-controlled'");
    expect(migration).toContain("CREATE TRIGGER orders_post_wallet_reward");
    expect(migration).toContain("'order-bonus:' || NEW.id::TEXT");
    expect(migration).toContain("'order-bonus-reversal:' || NEW.id::TEXT");
    expect(migration).toContain("ON CONFLICT (source_event_id) DO NOTHING");
    expect(migration).toContain("Only a delivered order can be returned");
  });

  it("keeps monthly commission separate from per-order bonuses", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.finalize_wallet_monthly_commission");
    expect(migration).toContain("order_row.status = 'delivered'");
    expect(migration).toContain("order_row.delivered_at >= p_period_start::TIMESTAMPTZ");
    expect(migration).toContain("commission_amount := round(delivered_total * settings_row.monthly_commission_rate / 100, 2)");
    expect(migration).toContain("Only completed months can be finalized");
    expect(migration).toContain("'monthly-commission:%s:%s:%s'");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.finalize_wallet_monthly_commission(UUID, UUID, DATE) TO service_role");
  });

  it("keeps server role checks in the DAL and exposes the wallet page", () => {
    expect(walletDal).toContain("requireWorkspaceContext()");
    expect(walletDal).toContain("requireWorkspaceRole([\"team_leader\", \"administrator\"])");
    expect(walletDal).toContain("WalletSectionState");
    expect(walletDal).toContain("sections:");
    expect(walletDal).toContain("Promise.allSettled");
    expect(walletDal).toContain("add_wallet_manual_adjustment");
    expect(walletPage).toContain("getWalletOverview");
    expect(walletPage).toContain("No wallet transactions yet");
    expect(walletPage).toContain("state === \"unavailable\"");
    expect(walletPage).toContain("Derived from posted ledger transactions");
    expect(walletPage).toContain('WalletManagerPanel mode="adjustment"');
    expect(settingsPage).toContain('WalletManagerPanel mode="settings"');
    expect(settingsPage).toContain('data-testid="wallet-settings-boundary"');
    expect(settingsPage).toContain('walletOverview.sections.settings.state');
    expect(settingsPage).toContain('walletOverview.sections.rules.state');
    expect(settingsPage).toContain("Wallet bonus rules unavailable");
    expect(rlsMigration).toContain("Workspace managers can view wallet settings");
    expect(rlsMigration).toContain("Workspace managers can view wallet bonus rules");
    expect(rlsMigration).toContain("private.is_workspace_manager_or_admin(workspace_id)");
  });
});
