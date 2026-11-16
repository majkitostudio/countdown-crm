// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/app/actions/products", () => ({
  createProductAction: mocks.create,
  updateProductAction: mocks.update,
  listProductsAction: vi.fn(),
}));

import { ProductModal } from "@/components/products/ProductModal";
import { createProduct, type Product } from "@/lib/products";

const product: Product = {
  id: "1", title: "Produkt", category: "supplements", price: 10,
  currency: "EUR", description: "", image_url: "", in_stock: true, created_at: "",
};

describe("product currency", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.create.mockResolvedValue(product);
    mocks.update.mockResolvedValue(product);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function render(value: Product | null) {
    act(() => {
      root.render(<ProductModal product={value} isOpen onClose={vi.fn()} onSaved={vi.fn()} />);
    });
    act(() => vi.runAllTimers());
  }

  function input(id: string, value: string) {
    const element = container.querySelector<HTMLInputElement>(`#${id}`)!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function submit() {
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  it("defaults a new product to CZK and allows EUR", async () => {
    render(null);
    expect(container.querySelector<HTMLInputElement>("#product-currency")!.value).toBe("CZK");
    input("product-title", "Nový produkt");
    input("product-currency", "eur");
    await submit();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ currency: "EUR" }));
  });

  it("keeps the existing currency out of an unrelated edit", async () => {
    render(product);
    expect(container.querySelector<HTMLInputElement>("#product-currency")!.value).toBe("EUR");
    await submit();
    expect(mocks.update).toHaveBeenCalledWith("1", expect.objectContaining({ currency: undefined }));
  });

  it("only saves an assumed CZK currency for an old product after confirmation", async () => {
    render({ ...product, currency: "CZK", currencyMissing: true });
    await submit();
    expect(mocks.update).toHaveBeenLastCalledWith("1", expect.objectContaining({ currency: undefined }));
    act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await submit();
    expect(mocks.update).toHaveBeenLastCalledWith("1", expect.objectContaining({ currency: "CZK" }));
  });

  it("defaults the create helper to CZK", async () => {
    await createProduct({ title: "Produkt" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ currency: "CZK" }));
  });
});
