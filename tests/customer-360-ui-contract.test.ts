import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CustomerSummaryCard } from "@/components/lead-card/CustomerSummaryCard";

const projectRoot = path.resolve(__dirname, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Customer 360 UI contract", () => {
  it("reports unavailable activity without fabricating a retention action", () => {
    const markup = renderToStaticMarkup(createElement(CustomerSummaryCard, {
      lead: { id: "lead-1", full_name: "Customer One" } as never,
      activity: { calls: [], orders: [] },
      activityUnavailable: true,
    }));

    expect(markup).toContain('data-testid="customer-summary"');
    expect(markup).toContain("Uložená data pracovního prostoru");
    expect(markup).toContain("Aktivity zákazníka nejsou dostupné");
    expect(markup).toContain("nebylo vytvořeno z náhradních dat");
    expect(markup).not.toContain("Další krok pro udržení zákazníka");
    expect(markup).not.toContain("Otevřít krok");
  });

  it("derives the retention step and KPIs from persisted activity only", () => {
    const markup = renderToStaticMarkup(createElement(CustomerSummaryCard, {
      lead: { id: "lead-1", status: "customer" } as never,
      activity: {
        calls: [{ created_at: "2026-09-11T10:00:00.000Z", outcome: "completed" }],
        orders: [{
          id: "order-1",
          created_at: "2026-09-11T11:00:00.000Z",
          product_title: "Starter product",
          total_amount: 125,
          currency: "CZK",
          status: "delivered",
        }],
      },
    }));

    expect(markup).toContain("Hovory");
    expect(markup).toContain("1/1");
    expect(markup).toContain("vyřízené / celkem");
    expect(markup).toContain("125,00 CZK");
    expect(markup).toContain("Poslední objednávka");
    expect(markup).toContain("Starter product");
    expect(markup).toContain("Další krok pro udržení zákazníka");
    expect(markup).toContain("Posoudit možnost opakovaného nákupu");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('href="/console?leadId=lead-1"');
  });

  it("keeps the rebuilt card subtree on the token set and shared primitives", () => {
    const cardSources = [
      "src/components/lead-card/CustomerIdentityCard.tsx",
      "src/components/lead-card/CustomerSummaryCard.tsx",
      "src/components/lead-card/CustomerTimelineFeed.tsx",
      "src/components/leads/LeadOrdersSection.tsx",
    ];

    for (const relativePath of cardSources) {
      const text = source(relativePath);
      expect(text, relativePath).not.toMatch(/\b(?:text|bg|border|ring|from|to)-(?:zinc|indigo|emerald|amber|violet)-\d{3}\b/);
      expect(text, relativePath).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(text, relativePath).not.toContain("transition-all");
      expect(text, relativePath).not.toMatch(/\brounded-(?:lg|xl|2xl|3xl)\b/);
    }

    const detailPage = source("src/app/leads/[leadId]/page.tsx");
    expect(detailPage).toContain("PageHeader");
    expect(detailPage).toContain("CustomerIdentityCard");
    expect(detailPage).toContain("CustomerSummaryCard");
    expect(detailPage).toContain("CustomerTimelineFeed");
    expect(detailPage).toContain("orders={activity.orders}");
    // The route heading belongs to PageHeader; the single <h1> left in the page is
    // the heading of the fallback screen shown when the contact cannot be loaded.
    expect(detailPage.match(/<h1\b/g) ?? []).toHaveLength(1);
    expect(detailPage).toContain("Kontakt není dostupný");

    for (const relativePath of cardSources) {
      expect(source(relativePath), relativePath).not.toMatch(/<h1\b/);
    }
  });
});
