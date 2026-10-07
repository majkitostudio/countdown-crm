import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCarrierCsv,
  escapeCsvField,
  normalizeOrderForCarrier,
} from "@/lib/carrierExport";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const mockOrderWithSnapshot: WorkspaceOrderDTO = {
  id: "ord-test-12345",
  lead_id: "lead-1",
  lead_name: "Petr Svoboda",
  status: "pending",
  total_amount: 1490.5,
  currency: "CZK",
  product_id: "prod-1",
  product_title: "Kloubní výživa Premium",
  order_source: "manual",
  agent_id: "agent-1",
  agent_name: "Karel Novotný",
  can_manage: true,
  items: [
    {
      id: "item-1",
      product_id: "prod-1",
      product_title: "Kloubní výživa Premium",
      quantity: 2,
      unit_price: 600,
      minimum_unit_price: 500,
      line_total: 1200,
      currency: "CZK",
    },
    {
      id: "item-2",
      product_id: "prod-2",
      product_title: "Vitamin C 1000mg",
      quantity: 1,
      unit_price: 290.5,
      minimum_unit_price: 200,
      line_total: 290.5,
      currency: "CZK",
    },
  ],
  status_history: [],
  revision: 1,
  delivered_at: null,
  delivery_address_snapshot: JSON.stringify({
    recipient_name: "Petr Svoboda",
    line1: "Dlouhá 456/12",
    line2: "2. patro",
    city: "Brno",
    postal_code: "602 00",
    country: "CZ",
  }),
  source_note: "Zvonit na zvonek Svoboda",
  created_at: "2026-10-07T10:00:00Z",
};

const mockOrderWithoutSnapshot: WorkspaceOrderDTO = {
  id: "ord-legacy-99999",
  lead_id: "lead-2",
  lead_name: "Jana Malá",
  status: "in_progress",
  total_amount: 890,
  currency: "CZK",
  product_id: "prod-3",
  product_title: "Detox Tea Pack",
  order_source: "manual",
  agent_id: "agent-2",
  agent_name: "Eva Černá",
  can_manage: true,
  items: [],
  status_history: [],
  revision: 1,
  delivered_at: null,
  delivery_address_snapshot: null,
  source_note: null,
  created_at: "2026-10-06T14:30:00Z",
};

describe("Milestone 1.2: Carrier Export Service", () => {
  describe("escapeCsvField", () => {
    it("escapes fields with commas, quotes, and newlines safely", () => {
      expect(escapeCsvField("Hello, world")).toBe('"Hello, world"');
      expect(escapeCsvField('Said "Hello"')).toBe('"Said ""Hello"""');
      expect(escapeCsvField("Line1\nLine2")).toBe('"Line1\nLine2"');
      expect(escapeCsvField("SimpleText")).toBe("SimpleText");
      expect(escapeCsvField(null)).toBe("");
      expect(escapeCsvField(undefined)).toBe("");
      expect(escapeCsvField(123.45)).toBe("123.45");
    });
  });

  describe("normalizeOrderForCarrier", () => {
    it("correctly extracts address snapshot components and parses street number and clean postal code", () => {
      const normalized = normalizeOrderForCarrier(mockOrderWithSnapshot);

      expect(normalized.orderId).toBe("ord-test-12345");
      expect(normalized.recipientName).toBe("Petr Svoboda");
      expect(normalized.firstName).toBe("Petr");
      expect(normalized.lastName).toBe("Svoboda");
      expect(normalized.street).toBe("Dlouhá");
      expect(normalized.streetNumber).toBe("456/12");
      expect(normalized.postalCode).toBe("60200");
      expect(normalized.city).toBe("Brno");
      expect(normalized.country).toBe("CZ");
      expect(normalized.codAmount).toBe(1490.5);
      expect(normalized.currency).toBe("CZK");
      expect(normalized.productsSummary).toBe("Kloubní výživa Premium (2ks); Vitamin C 1000mg (1ks)");
      expect(normalized.note).toBe("Zvonit na zvonek Svoboda");
      expect(normalized.hasValidAddress).toBe(true);
    });

    it("falls back gracefully when order has no delivery address snapshot", () => {
      const normalized = normalizeOrderForCarrier(mockOrderWithoutSnapshot);

      expect(normalized.orderId).toBe("ord-legacy-99999");
      expect(normalized.recipientName).toBe("Jana Malá");
      expect(normalized.firstName).toBe("Jana");
      expect(normalized.lastName).toBe("Malá");
      expect(normalized.street).toBe("");
      expect(normalized.streetNumber).toBe("");
      expect(normalized.postalCode).toBe("");
      expect(normalized.city).toBe("");
      expect(normalized.country).toBe("CZ");
      expect(normalized.productsSummary).toBe("Detox Tea Pack");
      expect(normalized.hasValidAddress).toBe(false);
    });
  });

  describe("buildCarrierCsv formats", () => {
    const orders = [mockOrderWithSnapshot, mockOrderWithoutSnapshot];

    it("generates valid Zásilkovna (Packeta) CSV format", () => {
      const csv = buildCarrierCsv(orders, "zasilkovna");
      const lines = csv.split("\r\n").filter(Boolean);

      expect(lines.length).toBe(3); // Header + 2 rows
      expect(lines[0]).toContain("Číslo objednávky");
      expect(lines[0]).toContain("Jméno");
      expect(lines[0]).toContain("Příjmení");
      expect(lines[0]).toContain("Ulice");
      expect(lines[0]).toContain("Číslo domu");
      expect(lines[0]).toContain("Obec");
      expect(lines[0]).toContain("PSČ");
      expect(lines[0]).toContain("Dobírka");

      // Row 1 (Petr Svoboda)
      expect(lines[1]).toContain("ord-test-12345");
      expect(lines[1]).toContain("Petr");
      expect(lines[1]).toContain("Svoboda");
      expect(lines[1]).toContain("Dlouhá");
      expect(lines[1]).toContain("456/12");
      expect(lines[1]).toContain("Brno");
      expect(lines[1]).toContain("60200");
      expect(lines[1]).toContain("1490.50");
      expect(lines[1]).toContain("CZK");
    });

    it("generates valid Balíkovna (Česká pošta) CSV format", () => {
      const csv = buildCarrierCsv(orders, "balikovna");
      const lines = csv.split("\r\n").filter(Boolean);

      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("Číslo objednávky (VS)");
      expect(lines[0]).toContain("Jméno příjemce");
      expect(lines[0]).toContain("Ulice a č.p.");
      expect(lines[0]).toContain("PSČ");
      expect(lines[0]).toContain("Dobírka");

      expect(lines[1]).toContain("ord-test-12345");
      expect(lines[1]).toContain("Petr Svoboda");
      expect(lines[1]).toContain('"Dlouhá 456/12, 2. patro"');
      expect(lines[1]).toContain("60200");
      expect(lines[1]).toContain("1490.50");
    });

    it("generates valid GLS CSV format", () => {
      const csv = buildCarrierCsv(orders, "gls");
      const lines = csv.split("\r\n").filter(Boolean);

      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("Reference");
      expect(lines[0]).toContain("Name");
      expect(lines[0]).toContain("Street");
      expect(lines[0]).toContain("COD Amount");

      expect(lines[1]).toContain("ord-test-12345");
      expect(lines[1]).toContain("Petr Svoboda");
      expect(lines[1]).toContain("60200");
      expect(lines[1]).toContain("1490.50");
    });

    it("generates valid Universal CSV format with Excel compatibility", () => {
      const csv = buildCarrierCsv(orders, "universal");
      const lines = csv.split("\r\n").filter(Boolean);

      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("Kód objednávky");
      expect(lines[0]).toContain("Příjemce");
      expect(lines[0]).toContain("Částka dobírky");
      expect(lines[0]).toContain("Ověřená adresa");

      // Valid address flag
      expect(lines[1]).toContain("ANO");
      expect(lines[2]).toContain("NE");
    });
  });

  describe("UI Integration Contracts", () => {
    it("integrates CarrierExportDropdown into OrderPipeline bulk bar and table header", () => {
      const pipelineCode = source("src/components/orders/OrderPipeline.tsx");

      expect(pipelineCode).toContain("CarrierExportDropdown");
      expect(pipelineCode).toContain('dataTestId="bulk-carrier-export"');
      expect(pipelineCode).toContain('dataTestId="pipeline-carrier-export"');
      expect(pipelineCode).toContain("Export štítků");
      expect(pipelineCode).toContain("Export pro dopravce");
    });

    it("integrates CarrierExportDropdown into Order detail page actions", () => {
      const detailCode = source("src/app/orders/[orderId]/page.tsx");

      expect(detailCode).toContain("CarrierExportDropdown");
      expect(detailCode).toContain('label="Exportovat štítek"');
    });

    it("CarrierExportDropdown component provides all 4 carrier format options", () => {
      const dropdownCode = source("src/components/orders/CarrierExportDropdown.tsx");

      expect(dropdownCode).toContain('"zasilkovna"');
      expect(dropdownCode).toContain('"balikovna"');
      expect(dropdownCode).toContain('"gls"');
      expect(dropdownCode).toContain('"universal"');
      expect(dropdownCode).toContain("Zásilkovna (Packeta)");
      expect(dropdownCode).toContain("Česká pošta (Balíkovna)");
      expect(dropdownCode).toContain("GLS");
    });
  });
});
