import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";
import { ProductScriptPanel } from "@/components/workspace/ProductScriptPanel";

vi.mock("@/app/actions/productScripts", () => ({
  getProductScriptAction: vi.fn(),
}));

const product = {
  id: "product-1",
  title: "Kloubní výživa",
  category: "supplements" as const,
  price: 499,
  currency: "CZK",
  description: "Podpora pohodlí kloubů.",
  image_url: "",
  in_stock: true,
  created_at: "2026-09-04T00:00:00.000Z",
};

describe("product script section structure", () => {
  it("keeps the fallback script in the four operator-facing conversation sections", () => {
    const html = buildDefaultScriptHtml(product);
    const sectionLabels = [
      "1. První pozitivní dojem",
      "2. Zjištění potřeb",
      "3. Představení řešení",
      "4. Závěrečný pozitivní dojem",
    ];

    expect(sectionLabels.every((label) => html.includes(`<strong>${label}</strong>`))).toBe(true);
    expect(sectionLabels.map((label) => html.indexOf(label))).toEqual(
      [...sectionLabels].sort((left, right) => html.indexOf(left) - html.indexOf(right)).map((label) => html.indexOf(label)),
    );
  });

  it("uses the operator reading-flow treatment for the live script", () => {
    const panel = readFileSync(
      path.join(process.cwd(), "src", "components", "workspace", "ProductScriptPanel.tsx"),
      "utf8",
    );

    expect(panel).toContain("operator-script-reading-flow");
  });

  it("shows the immutable call snapshot instead of a newer current script", () => {
    const rendered = renderToStaticMarkup(React.createElement(ProductScriptPanel, {
      product,
      isCallActive: true,
      activeSnapshot: {
        source: "published_version",
        productId: product.id,
        productTitle: product.title,
        versionId: "version-7",
        versionNumber: 7,
        html: "<p>Approved v7 used for this call</p>",
        capturedAt: "2026-09-07T10:00:00.000Z",
      },
    }));

    expect(rendered).toContain("Approved v7 used for this call");
    expect(rendered).not.toContain("První pozitivní dojem");
    expect(rendered).toContain("Version 7 captured for this call");
  });
});
