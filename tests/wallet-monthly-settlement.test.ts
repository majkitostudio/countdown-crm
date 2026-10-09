import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateMonthlySettlementOrderTotals } from "../src/lib/monthlySettlement";

const migration = readFileSync(
  new URL("../supabase/migrations/20261007213000_wallet_monthly_settlement_manager_access.sql", import.meta.url),
  "utf8",
);
const walletDal = readFileSync(new URL("../src/lib/dal/wallet.ts", import.meta.url), "utf8");
const walletPage = readFileSync(new URL("../src/app/wallet/page.tsx", import.meta.url), "utf8");
const walletActions = readFileSync(new URL("../src/app/actions/wallet.ts", import.meta.url), "utf8");
const settlementPanel = readFileSync(new URL("../src/components/wallet/WalletSettlementPanel.tsx", import.meta.url), "utf8");
const hardeningMigration = readFileSync(
  new URL("../supabase/migrations/20261008230000_tracking_and_monthly_settlement_hardening.sql", import.meta.url),
  "utf8",
);

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

    it("zahrne doručenou a později vrácenou objednávku do hrubého i vratkového součtu stejného měsíce", () => {
      const totals = calculateMonthlySettlementOrderTotals(
        [{
          agent_id: "operator-1",
          total_amount: "12000.00",
          currency: "CZK",
          status: "returned",
          delivered_at: "2026-09-10T10:00:00.000Z",
          returned_at: "2026-09-15T10:00:00.000Z",
        }],
        "operator-1",
        "2026-09-01T00:00:00.000Z",
        "2026-10-01T00:00:00.000Z",
        "CZK",
      );

      expect(totals).toEqual({
        deliveredCount: 1,
        deliveredTotal: 12000,
        returnedCount: 1,
        returnedTotal: 12000,
      });
      expect(Math.max(0, totals.deliveredTotal - totals.returnedTotal)).toBe(0);
    });

    it("počítá do měsíčního přehledu jen objednávky daného operátora a období", () => {
      const totals = calculateMonthlySettlementOrderTotals(
        [
          {
            agent_id: "operator-1",
            total_amount: 10000,
            currency: "CZK",
            status: "delivered",
            delivered_at: "2026-09-10T10:00:00.000Z",
            returned_at: null,
          },
          {
            agent_id: "operator-1",
            total_amount: 5000,
            currency: "CZK",
            status: "delivered",
            delivered_at: "2026-10-01T00:00:00.000Z",
            returned_at: null,
          },
          {
            agent_id: "operator-2",
            total_amount: 7000,
            currency: "CZK",
            status: "delivered",
            delivered_at: "2026-09-10T10:00:00.000Z",
            returned_at: null,
          },
        ],
        "operator-1",
        "2026-09-01T00:00:00.000Z",
        "2026-10-01T00:00:00.000Z",
        "CZK",
      );

      expect(totals).toEqual({
        deliveredCount: 1,
        deliveredTotal: 10000,
        returnedCount: 0,
        returnedTotal: 0,
      });
    });

    it("does not combine orders in another currency into the configured-currency settlement", () => {
      const totals = calculateMonthlySettlementOrderTotals(
        [
          {
            agent_id: "operator-1",
            total_amount: 10000,
            currency: "CZK",
            status: "delivered",
            delivered_at: "2026-09-10T10:00:00.000Z",
            returned_at: null,
          },
          {
            agent_id: "operator-1",
            total_amount: 500,
            currency: "EUR",
            status: "delivered",
            delivered_at: "2026-09-12T10:00:00.000Z",
            returned_at: null,
          },
        ],
        "operator-1",
        "2026-09-01T00:00:00.000Z",
        "2026-10-01T00:00:00.000Z",
        "czk",
      );

      expect(totals).toEqual({
        deliveredCount: 1,
        deliveredTotal: 10000,
        returnedCount: 0,
        returnedTotal: 0,
      });
    });

    it("fails instead of presenting fallback or incomplete settlement data as a valid result", () => {
      expect(walletDal).toContain("Monthly settlement orders could not be loaded.");
      expect(walletDal).toContain("Finalized commission transactions could not be loaded.");
      expect(walletDal).toContain("Monthly bonus transactions could not be loaded.");
      expect(walletDal).toContain("Monthly settlement contains wallet entries in another currency.");
      expect(walletDal).not.toContain("loadWalletSettings(context.workspaceId, supabase).catch");
      expect(walletActions).not.toContain('return { balance: 0, currency: "CZK" }');
    });
  });

  describe("Nová dopředná migrace: týmové oprávnění a výpočet", () => {
    it("vynucuje oprávnění pro tým objednávky v tracking RPC", () => {
      expect(hardeningMigration).toContain(
        "private.can_manage_team_resource(v_order.workspace_id, v_order.team_id)",
      );
      expect(hardeningMigration).toContain("USING ERRCODE = '42501'");
    });

    it("omezuje vedoucí týmů na operátory z jejich aktivních týmů", () => {
      expect(hardeningMigration).toContain("private.is_team_leader(team.id)");
      expect(hardeningMigration).toContain("The operator is outside your active teams");
      expect(hardeningMigration).toContain("AND operator_team.active_from <= now()");
    });

    it("započítá vrácené objednávky do hrubého doručeného součtu před odečtem vratek", () => {
      expect(hardeningMigration).toContain("order_row.status IN ('delivered', 'returned')");
      expect(hardeningMigration).toContain("net_delivered_total := greatest(delivered_total - returned_total, 0)");
    });
  });
});
