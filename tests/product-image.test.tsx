// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { ProductImage } from "@/components/products/ProductImage";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("ProductImage", () => {
  it("shows the accessible empty state instead of an empty image request", () => {
    const html = renderToStaticMarkup(React.createElement(ProductImage, {
      src: "  ",
      alt: "Example product",
      fallbackText: "No product image",
    }));

    expect(html).not.toContain("<img");
    expect(html).toContain('role="img"');
    expect(html).toContain("Example product: bez obrázku produktu");
    expect(html).toContain("No product image");
  });

  it("uses a supplied product image URL", () => {
    const html = renderToStaticMarkup(React.createElement(ProductImage, {
      src: "/images/example.svg",
      alt: "Example product",
    }));

    expect(html).toContain('src="/images/example.svg"');
    expect(html).toContain('alt="Example product"');
  });

  it("replaces a broken product image with the accessible empty state", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(React.createElement(ProductImage, {
        src: "/missing-product-image.png",
        alt: "Example product",
        fallbackText: "No product image",
      }));
    });

    const image = container.querySelector("img");
    expect(image).not.toBeNull();

    await act(async () => {
      image?.dispatchEvent(new Event("error"));
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Example product: bez obrázku produktu");
    expect(container.textContent).toContain("No product image");
  });
});
