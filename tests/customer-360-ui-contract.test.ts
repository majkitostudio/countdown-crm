import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Customer360RetentionCard } from "@/components/leads/Customer360RetentionCard";

describe("Customer 360 UI contract", () => {
  it("renders persisted activity without fabricating a retention action", () => {
    const markup = renderToStaticMarkup(createElement(Customer360RetentionCard, {
      lead: { id: "lead-1", full_name: "Customer One" } as never,
      activity: { calls: [], orders: [] },
      activityUnavailable: true,
    }));

    expect(markup).toContain('data-testid="customer-360-retention"');
    expect(markup).toContain("Persisted workspace data");
    expect(markup).toContain("Customer activity is unavailable");
    expect(markup).not.toContain("Next retention action");
  });

  it("renders persisted activity through the shared neutral surfaces", () => {
    const markup = renderToStaticMarkup(createElement(Customer360RetentionCard, {
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

    expect(markup).toContain("Calls");
    expect(markup).toContain("1/1");
    expect(markup).toContain("Next retention action");
    expect(markup).toContain("bg-zinc-950/60");
    expect(markup).toContain('<div class="p-4">');
  });
});
