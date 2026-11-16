import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";

const mocks = vi.hoisted(() => ({
  getWorkspaceOrder: vi.fn(),
  requireWorkspaceContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/activity", () => ({ getWorkspaceOrder: mocks.getWorkspaceOrder }));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceContext: mocks.requireWorkspaceContext }));
vi.mock("@/app/actions/crm", () => ({ updateOrderTrackingAction: vi.fn() }));
vi.mock("@/components/orders/OrderStatusEditor", () => ({ OrderStatusEditor: () => null }));

import { OrderPipeline } from "@/components/orders/OrderPipeline";
import { OrderKanban } from "@/components/orders/OrderKanban";
import OrderDetailPage from "@/app/orders/[orderId]/page";

const order: WorkspaceOrderDTO = {
  id: "order-1",
  lead_id: "lead-1",
  lead_name: "Zákazník",
  product_id: "product-1",
  product_title: "Produkt",
  agent_id: "agent-1",
  agent_name: "Operátor",
  total_amount: 125.5,
  currency: "CZK",
  items: [],
  status: "in_progress",
  order_source: "manual",
  source_note: null,
  delivery_address_snapshot: null,
  delivered_at: null,
  status_history: [],
  revision: 1,
  created_at: "2026-09-12T08:00:00.000Z",
};

const normalize = (html: string) => html.replace(/[\s\u00a0\u202f]+/g, " ");

describe("order currency display", () => {
  it("shows missing amounts and displays missing currency as CZK", () => {
    const html = normalize(renderToStaticMarkup(<OrderPipeline initialViewMode="table" orders={[
      { ...order, total_amount: null },
      { ...order, id: "order-2", currency: null, total_amount: 0 },
    ]} />));
    expect(html).toContain("—");
    expect(html).toContain("0,00 CZK");
    expect(html).not.toContain("USD");
  });
  it("formats table and mobile cards consistently, including zero and foreign currencies", () => {
    const html = normalize(renderToStaticMarkup(
      <OrderPipeline initialViewMode="table" orders={[
        order,
        { ...order, id: "order-2", total_amount: 0 },
        { ...order, id: "order-3", currency: "EUR", total_amount: 9.25 },
      ]} />,
    ));
    expect(html.match(/125,50/g)).toHaveLength(2);
    expect(html.match(/0,00/g)).toHaveLength(2);
    expect(html.match(/9,25\s*€/g)).toHaveLength(2);
    expect(html).toContain("125,50 CZK");
  });

  it("keeps fractional amounts in the kanban", () => {
    const html = normalize(renderToStaticMarkup(<OrderKanban orders={[
      order,
      { ...order, id: "order-2", currency: "EUR", total_amount: 9.25 },
      { ...order, id: "order-3", total_amount: 0 },
    ]} />));
    expect(html).toContain("125,50");
    expect(html).toMatch(/9,25\s*€/);
    expect(html).toContain("0,00");
    expect(html).toContain("125,50 CZK");
  });

  it("formats saved item amounts and totals on the order detail", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue({ role: "administrator", userId: "agent-1" });
    mocks.getWorkspaceOrder.mockResolvedValue({
      ...order,
      items: [{
        id: "item-1", product_id: "product-1", product_title: "Produkt",
        unit_price: 0, minimum_unit_price: 125.5, quantity: 1, line_total: 0, currency: "CZK",
      }],
    });
    const html = normalize(renderToStaticMarkup(await OrderDetailPage({
      params: Promise.resolve({ orderId: order.id }),
    })));
    expect(html).toContain("0,00 CZK za kus");
    expect(html).toContain("125,50 CZK za kus");
  });

  it("retains a foreign currency on the order detail", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue({ role: "administrator", userId: "agent-1" });
    mocks.getWorkspaceOrder.mockResolvedValue({ ...order, currency: "EUR", total_amount: 9.25 });
    const html = normalize(renderToStaticMarkup(await OrderDetailPage({
      params: Promise.resolve({ orderId: order.id }),
    })));
    expect(html).toMatch(/9,25\s*€/);
  });
});
