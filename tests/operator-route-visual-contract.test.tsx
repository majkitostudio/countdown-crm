import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderPipeline, getOrderStatusTone } from "@/components/orders/OrderPipeline";
import { StatusBadge } from "@/components/ui/Status";
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
  status_history: [],
  revision: 1,
  created_at: "2026-09-12T08:00:00.000Z",
} satisfies Omit<WorkspaceOrderDTO, "status">;

describe("daily operator route rendering", () => {
  it("renders the orders filter as accessible shared buttons while keeping normal order status neutral", () => {
    const markup = renderToStaticMarkup(<OrderPipeline orders={[{ ...baseOrder, status: "in_progress" } as WorkspaceOrderDTO]} />);

    expect(markup).toContain("In-Progress");
    expect(markup).toContain("border-zinc-700 bg-zinc-900 text-zinc-300");
    expect(markup).toContain("focus-visible:ring-2");
    expect(getOrderStatusTone("in_progress")).toBe("neutral");
    expect(renderToStaticMarkup(<StatusBadge tone="neutral">In progress</StatusBadge>)).not.toMatch(/emerald|amber|rose/);
  });

  it("keeps delivered confirmation as the approved semantic success state", () => {
    const markup = renderToStaticMarkup(<OrderPipeline orders={[{ ...baseOrder, status: "delivered" } as WorkspaceOrderDTO]} />);

    expect(markup).toContain("Delivered");
    expect(markup).toContain("border-emerald-800/50 bg-emerald-950/20 text-emerald-200");
    expect(getOrderStatusTone("delivered")).toBe("success");
  });
});
