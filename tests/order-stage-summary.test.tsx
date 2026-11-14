import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderStageSummary } from "@/components/orders/OrderStageSummary";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";

const baseOrder = {
  id: "order-1",
  lead_id: "lead-1",
  lead_name: "Customer One",
  product_id: "product-1",
  product_title: "Starter product",
  agent_id: "agent-1",
  agent_name: "Operator One",
  total_amount: 125,
  currency: "CZK",
  items: [],
  order_source: "manual",
  source_note: null,
  delivery_address_snapshot: null,
  delivered_at: null,
  status_history: [],
  revision: 1,
  created_at: "2026-09-12T08:00:00.000Z",
} satisfies Omit<WorkspaceOrderDTO, "status">;

function order(overrides: Partial<WorkspaceOrderDTO>): WorkspaceOrderDTO {
  return { ...baseOrder, status: "in_progress", ...overrides } as WorkspaceOrderDTO;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("OrderStageSummary", () => {
  it("shows every stage label plus warning and alarm counters", () => {
    const markup = renderToStaticMarkup(
      <OrderStageSummary
        orders={[
          order({ status: "in_progress" }),
          order({ status: "sent", package_location: "Z-BOX", package_arrived_at: daysAgo(4) }),
        ]}
      />,
    );

    expect(markup).toContain('data-testid="order-stage-summary"');
    expect(markup).toContain("Celkem");
    expect(markup).toContain("Zpracovává se");
    expect(markup).toContain("Čeká na vyzvednutí");
    expect(markup).toContain("Doručeno");
    expect(markup).toContain("Vráceno");
    expect(markup).toContain("Zrušeno");
    expect(markup).toContain("Upozornění");
    expect(markup).toContain("Výstraha");
  });
});
