import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPayrollCsv, escapeCsvField } from "../src/lib/payrollExport";
import type { MonthlySettlementSummaryDTO } from "../src/lib/dal/wallet";

const walletDal = readFileSync(new URL("../src/lib/dal/wallet.ts", import.meta.url), "utf8");
const settlementPanel = readFileSync(new URL("../src/components/wallet/WalletSettlementPanel.tsx", import.meta.url), "utf8");

describe("Milník 4.2: Export podkladů pro mzdy (Payroll Export)", () => {
  const mockSummary: MonthlySettlementSummaryDTO = {
    periodStart: "2026-09-01",
    periodEnd: "2026-10-01",
    currency: "CZK",
    commissionRate: 8,
    totalDeliveredTotal: 150000,
    totalReturnedTotal: 10000,
    totalNetTurnover: 140000,
    totalFixedBonuses: 6500,
    totalCommission: 11200,
    totalManualAdjustments: 500,
    totalPayout: 18200,
    canFinalize: true,
    operators: [
      {
        userId: "user-1",
        userName: "Jan Novák",
        userEmail: "jan.novak@countdown.cz",
        deliveredCount: 45,
        deliveredTotal: 90000,
        returnedCount: 5,
        returnedTotal: 6000,
        netTurnover: 84000,
        fixedBonuses: 4000,
        commissionRate: 8,
        commissionAmount: 6720,
        manualAdjustments: 500,
        totalPayout: 11220,
        isFinalized: true,
        transactionId: "txn-123",
      },
      {
        userId: "user-2",
        userName: "Eva Svobodová",
        userEmail: "eva.svobodova@countdown.cz",
        deliveredCount: 30,
        deliveredTotal: 60000,
        returnedCount: 2,
        returnedTotal: 4000,
        netTurnover: 56000,
        fixedBonuses: 2500,
        commissionRate: 8,
        commissionAmount: 4480,
        manualAdjustments: 0,
        totalPayout: 6980,
        isFinalized: false,
        transactionId: null,
      },
    ],
  };

  describe("Generování CSV podkladů (buildPayrollCsv)", () => {
    it("obsahuje všechny mzdové sloupce definované v zadání", () => {
      const csv = buildPayrollCsv(mockSummary);
      const lines = csv.trim().split("\r\n");
      const headerLine = lines[0];

      expect(headerLine).toContain("Operátor");
      expect(headerLine).toContain("Doručené objednávky (ks)");
      expect(headerLine).toContain("Čistý obrat");
      expect(headerLine).toContain("Fixní bonusy");
      expect(headerLine).toContain("Procentuální provize");
      expect(headerLine).toContain("K výplatě");
    });

    it("správně napočítá data jednotlivých operátorů včetně vratek a čisté výplaty", () => {
      const csv = buildPayrollCsv(mockSummary);
      const lines = csv.trim().split("\r\n");

      // Jan Novák
      const janLine = lines.find((l) => l.includes("Jan Novák"));
      expect(janLine).toBeDefined();
      expect(janLine).toContain("jan.novak@countdown.cz");
      expect(janLine).toContain("84000"); // čistý obrat
      expect(janLine).toContain("4000"); // fixní bonusy
      expect(janLine).toContain("6720"); // procentuální provize
      expect(janLine).toContain("11220"); // celkem k výplatě
      expect(janLine).toContain("Uzavřeno a vyplaceno");

      // Eva Svobodová
      const evaLine = lines.find((l) => l.includes("Eva Svobodová"));
      expect(evaLine).toBeDefined();
      expect(evaLine).toContain("56000");
      expect(evaLine).toContain("2500");
      expect(evaLine).toContain("4480");
      expect(evaLine).toContain("6980");
      expect(evaLine).toContain("K uzávěrce");
    });

    it("obsahuje souhrnný řádek CELKEM TÝM se součty", () => {
      const csv = buildPayrollCsv(mockSummary);
      const lines = csv.trim().split("\r\n");
      const summaryLine = lines[lines.length - 1];

      expect(summaryLine).toContain("CELKEM TÝM");
      expect(summaryLine).toContain("140000"); // celkový čistý obrat
      expect(summaryLine).toContain("6500"); // celkové fixní bonusy
      expect(summaryLine).toContain("11200"); // celková provize
      expect(summaryLine).toContain("18200"); // celkem k výplatě týmu
    });

    it("respektuje volitelný oddělovač (např. čárka)", () => {
      const csv = buildPayrollCsv(mockSummary, { delimiter: "," });
      expect(csv.split("\r\n")[0]).toContain("Operátor,Email,Období");
    });
  });

  describe("Bezpečné escapování hodnot (escapeCsvField)", () => {
    it("escapuje uvozovky a hodnoty s oddělovači", () => {
      expect(escapeCsvField('Novák "Senior"')).toBe('"Novák ""Senior"""');
      expect(escapeCsvField("Praha; CZ")).toBe('"Praha; CZ"');
      expect(escapeCsvField(null)).toBe("");
      expect(escapeCsvField(undefined)).toBe("");
      expect(escapeCsvField(1234)).toBe("1234");
    });
  });

  describe("DAL a typový kontrakt (src/lib/dal/wallet.ts)", () => {
    it("zahrnuje mzdová pole v OperatorSettlementDTO a MonthlySettlementSummaryDTO", () => {
      expect(walletDal).toContain("userEmail: string;");
      expect(walletDal).toContain("fixedBonuses: number;");
      expect(walletDal).toContain("manualAdjustments: number;");
      expect(walletDal).toContain("totalPayout: number;");
      expect(walletDal).toContain("totalFixedBonuses: number;");
      expect(walletDal).toContain("totalManualAdjustments: number;");
    });

    it("načítá period bonus transactions pro fixní bonusy a manuální korekce", () => {
      expect(walletDal).toContain('"order_bonus", "reversal", "manual_adjustment"');
      expect(walletDal).toContain("txn.transaction_type === \"order_bonus\"");
      expect(walletDal).toContain("txn.transaction_type === \"manual_adjustment\"");
    });
  });

  describe("UI integrace v WalletSettlementPanel.tsx", () => {
    it("obsahuje exportní tlačítko a mzdovou tabulku se všemi sloupci", () => {
      expect(settlementPanel).toContain("exportPayrollToCsv");
      expect(settlementPanel).toContain("Exportovat mzdy (CSV)");
      expect(settlementPanel).toContain("Mzdový přehled operátorů");
      expect(settlementPanel).toContain("Počet objednávek");
      expect(settlementPanel).toContain("Celkový obrat");
      expect(settlementPanel).toContain("Fixní bonusy");
      expect(settlementPanel).toContain("Procentuální provize");
      expect(settlementPanel).toContain("K výplatě");
    });
  });
});
