// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), complete: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/actions/crm", () => ({ createOrderAction: mocks.create }));
vi.mock("@/app/actions/leadQueue", () => ({ completeLeadCallAction: mocks.complete }));
vi.mock("@/app/actions/leadNotes", () => ({ listLeadNotesAction: vi.fn().mockResolvedValue([]) }));

import { OrderCreateForm } from "@/components/orders/OrderCreateForm";

describe("order with a product without stored currency", () => {
  it("shows CZK but prevents submission before the currency is confirmed", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<OrderCreateForm
        leads={[{ id: "lead", full_name: "Zákazník", phone: "", email: null, city: null }]}
        products={[{ id: "product", title: "Produkt", category: "supplements", price: 10, currency: null, in_stock: true }]}
        initialLeadId="lead"
      />);
    });
    expect(container.textContent).toContain("10,00 CZK");
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain("U produktu chybí uložená měna");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
});
