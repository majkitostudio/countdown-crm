// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  completeCall: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/app/actions/crm", () => ({ createOrderAction: mocks.createOrder }));
vi.mock("@/app/actions/leadQueue", () => ({ completeLeadCallAction: mocks.completeCall }));
vi.mock("@/app/actions/leadNotes", () => ({ listLeadNotesAction: vi.fn().mockResolvedValue([]) }));

import { OrderCreateForm } from "@/components/orders/OrderCreateForm";

describe("new order delivery address defaults", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();
    mocks.createOrder.mockResolvedValue({ id: "order-1" });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function setInput(id: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`Expected input #${id}`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("stores the visible CZ default when creating an order without changing the country field", async () => {
    await act(async () => {
      root.render(<OrderCreateForm
        leads={[{ id: "lead-1", full_name: "Jana Nováková", phone: "", email: null, city: "Brno" }]}
        products={[{ id: "product-1", title: "Produkt", category: "supplements", price: 100, currency: "CZK", in_stock: true }]}
        initialLeadId="lead-1"
      />);
    });

    expect(container.querySelector<HTMLInputElement>("#order-delivery-address-country")?.value).toBe("CZ");
    act(() => {
      setInput("order-delivery-address-recipient-name", "Jana Nováková");
      setInput("order-delivery-address-line1", "Hlavní 1");
      setInput("order-delivery-address-city", "Brno");
      setInput("order-delivery-address-postal-code", "602 00");
    });

    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      delivery_address_snapshot: expect.objectContaining({ country: "CZ" }),
    }));
  });
});
