import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";
import { ProductScriptPanel } from "@/components/workspace/ProductScriptPanel";
import { ProductScriptManager } from "@/components/settings/ProductScriptManager";

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
    expect(panel).not.toContain("[&_mark]");
    expect(panel).toContain('text-xs text-zinc-400">Ptejte se při naslouchání');
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
    expect(rendered).toContain("Pro tento hovor byla zachycena verze 7");
  });

  it("explains the recovery for a historical call that captured the built-in fallback", () => {
    const rendered = renderToStaticMarkup(React.createElement(ProductScriptPanel, {
      product,
      isCallActive: true,
      activeSnapshot: {
        source: "built_in_fallback",
        productId: product.id,
        productTitle: product.title,
        versionId: null,
        versionNumber: null,
        html: "<p>Fallback content must stay hidden</p>",
        capturedAt: "2026-09-07T10:00:00.000Z",
      },
    }));

    expect(rendered).toContain("nebyl zachycen publikovaný schválený skript");
    expect(rendered).toContain("náhradní text nezobrazuje");
    expect(rendered).toContain("požádejte správce o publikování schváleného skriptu");
    expect(rendered).not.toContain("Fallback content must stay hidden");
  });

  it("gives the script editor an accessible name and preserves the shared focus ring", () => {
    const rendered = renderToStaticMarkup(React.createElement(ProductScriptManager, {
      products: [{ ...product, title: "Produkt s názvem, který se musí zobrazit celý i na úzké obrazovce" }],
      initialScripts: [],
      initialVersions: [],
    }));
    const editorMarkup = rendered.match(/<div contentEditable="true"[^>]*>/)?.[0];

    expect(editorMarkup).toBeDefined();
    expect(editorMarkup).toContain('role="textbox"');
    expect(editorMarkup).toContain('aria-label="Text produktového skriptu"');
    expect(editorMarkup).toContain('aria-multiline="true"');
    expect(editorMarkup).not.toContain("outline-none");
    expect(rendered).toContain('class="block break-words text-xs font-medium">Produkt s názvem, který se musí zobrazit celý i na úzké obrazovce</span>');
    expect(rendered).toContain('class="break-words text-lg font-semibold text-zinc-100">Produkt s názvem, který se musí zobrazit celý i na úzké obrazovce</h2>');
    expect(rendered).toContain('class="flex flex-wrap items-center gap-2"');
  });

  it("does not offer or render text highlighting in the script editor", () => {
    const editor = readFileSync(
      path.join(process.cwd(), "src", "components", "settings", "ProductScriptManager.tsx"),
      "utf8",
    );

    expect(editor).not.toMatch(/Highlighter|hiliteColor|Zvýraznění|\[_mark\]/);
  });
});
