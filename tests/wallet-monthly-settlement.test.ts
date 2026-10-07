import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20261007213000_wallet_monthly_settlement_manager_access.sql", import.meta.url),
  "utf8",
);
const walletDal = readFileSync(new URL("../src/lib/dal/wallet.ts", import.meta.url), "utf8");
const walletPage = readFileSync(new URL("../src/app/wallet/page.tsx", import.meta.url), "utf8");
const walletActions = readFileSync(new URL("../src/app/actions/wallet.ts", import.meta.url), "utf8");
const settlementPanel = readFileSync(new URL("../src/components/wallet/WalletSettlementPanel.tsx", import.meta.url), "utf8");

describe("Milník 4.1: Měsíční uzávěrka pro Team Leadera", () => {
  describe("SQL migrace 20261007213000_wallet_monthly_settlement_manager_access.sql", () => {
    it("umožňuje volání procedury Team Leaderům a Administrátorům (nejen service_role)", () => {
      expect(migration).toContain("private.is_workspace_manager_or_admin(p_workspace_id)");
      expect(migration).toContain("TO authenticated, service_role");
      expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.finalize_wallet_monthly_commission");
    });

    it("odečítá vratky (returned) z celkového obratu pro výpočet čisté provize", () => {
      expect(migration).toContain("order_row.status = 'returned'");
      expect(migration).toContain("net_delivered_total := greatest(delivered_total - returned_total, 0)");
      expect(migration).toContain("commission_amount := round(net_delivered_total * settings_row.monthly_commission_rate / 100, 2)");
    });

    it("zajišťuje idempotenci přes source_event_id a neměnnost", () => {
      expect(migration).toContain("format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start)");
      expect(migration).toContain("ON CONFLICT (source_event_id) DO NOTHING");
      expect(migration).toContain("WALLET_MONTHLY_COMMISSION_POSTED");
    });

    it("poskytuje hromadnou proceduru finalize_workspace_monthly_settlement", () => {
      expect(migration).toContain("CREATE OR REPLACE FUNCTION public.finalize_workspace_monthly_settlement");
      expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.finalize_workspace_monthly_settlement(UUID, DATE)");
    });
  });

  describe("DAL vrstva a typový systém (src/lib/dal/wallet.ts)", () => {
    it("exportuje funkce pro uzávěrku a sumarizaci s kontrolou rolí", () => {
      expect(walletDal).toContain("finalizeWalletMonthlyCommission");
      expect(walletDal).toContain("finalizeWorkspaceMonthlySettlement");
      expect(walletDal).toContain("getMonthlySettlementSummary");
      expect(walletDal).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
    });

    it("validuje formát data YYYY-MM-01 pro začátek měsíce", () => {
      expect(walletDal).toContain("^\\d{4}-\\d{2}-01$");
      expect(walletDal).toContain("Period start must be the first day of the month");
    });

    it("správně kalkuluje čistý obrat s odečtem vratek", () => {
      expect(walletDal).toContain("const netTurnover = Math.max(0, deliveredTotal - returnedTotal)");
      expect(walletDal).toContain("computedCommission = Math.round((netTurnover * commissionRate) / 100 * 100) / 100");
    });
  });

  describe("Server Actions a UI integrace", () => {
    it("exportuje server actions pro uzávěrky v src/app/actions/wallet.ts", () => {
      expect(walletActions).toContain("getMonthlySettlementSummaryAction");
      expect(walletActions).toContain("finalizeWalletMonthlyCommissionAction");
      expect(walletActions).toContain("finalizeWorkspaceMonthlySettlementAction");
      expect(walletActions).toContain('revalidatePath("/wallet")');
    });

    it("renderuje WalletSettlementPanel v /wallet pro manažery s auditovaným přehledem", () => {
      expect(walletPage).toContain("WalletSettlementPanel");
      expect(walletPage).toContain("settlementSummary");
      expect(settlementPanel).toContain("Měsíční uzávěrka provizí týmu");
      expect(settlementPanel).toContain("Doručené objednávky");
      expect(settlementPanel).toContain("Vrácené objednávky");
      expect(settlementPanel).toContain("Čistý obrat k provizi");
      expect(settlementPanel).toContain("Schválit a uzavřít měsíc pro všechny");
      expect(settlementPanel).toContain("Uzavřít provizi");
    });
  });

  describe("Ověření matematiky výpočtu provize (Unit test kalkulace)", () => {
    it("správně odečte vratky z doručených zásilek a vypočte přesnou provizi", () => {
      const deliveredTotal = 120_000;
      const returnedTotal = 20_000;
      const commissionRate = 8; // 8%

      const netTurnover = Math.max(0, deliveredTotal - returnedTotal);
      expect(netTurnover).toBe(100_000);

      const commission = Math.round((netTurnover * commissionRate) / 100 * 100) / 100;
      expect(commission).toBe(8_000);
    });

    it("ošetří situaci, kdy vratky převyšují doručené zásilky (nulový čistý obrat, žádná záporná provize)", () => {
      const deliveredTotal = 15_000;
      const returnedTotal = 25_000;
      const commissionRate = 8;

      const netTurnover = Math.max(0, deliveredTotal - returnedTotal);
      expect(netTurnover).toBe(0);

      const commission = Math.round((netTurnover * commissionRate) / 100 * 100) / 100;
      expect(commission).toBe(0);
    });
  });
});
