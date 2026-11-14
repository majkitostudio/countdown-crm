import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/productCatalog", () => ({ loadProductCatalogAction: vi.fn() }));
vi.mock("@/app/actions/products", () => ({ deleteProductAction: vi.fn() }));
vi.mock("@/app/actions/crm", () => ({ reassignOrdersProductAction: vi.fn() }));
vi.mock("@/components/layout/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => React.createElement("header", null, title, actions),
}));
vi.mock("@/components/products/ObjectionDrawer", () => ({ ObjectionDrawer: () => null }));
vi.mock("@/components/products/ProductModal", () => ({ ProductModal: () => null }));
vi.mock("@/components/products/ObjectionEditorModal", () => ({ ObjectionEditorModal: () => null }));
vi.mock("@/components/products/CallTranscriptUploaderModal", () => ({ CallTranscriptUploaderModal: () => null }));

import { ProductCatalogClient } from "@/app/products/ProductCatalogClient";
import type { ProductCatalogLoadResult } from "@/lib/dal/productCatalog";

const readyCatalog: ProductCatalogLoadResult = {
  catalog: {
    status: "ready" as const,
    data: [{
      id: "product-1",
      title: "Joint support",
      category: "supplements" as const,
      price: 499,
      currency: "CZK",
      description: "Supports comfortable movement.",
      image_url: "",
      in_stock: true,
      created_at: "2026-09-08T10:00:00.000Z",
    }],
  },
  objections: {
    requested: true as const,
    source: { status: "ready" as const, data: [{
      id: "objection-1",
      workspace_id: "workspace-1",
      product_id: "product-1",
      objection_title: "Too expensive",
      rebuttal_args: ["Emphasize the warranty."],
      created_at: "2026-09-08T10:30:00.000Z",
    }] },
  },
  orderCounts: { requested: true as const, source: { status: "ready" as const, data: { "product-1": 3 } } },
  state: "ready" as const,
  isEmpty: false,
};

function renderCatalog(role: "operator" | "team_leader", catalog: ProductCatalogLoadResult = readyCatalog) {
  return renderToStaticMarkup(React.createElement(ProductCatalogClient, { role, initialCatalog: catalog }));
}

describe("ProductCatalogClient role surface", () => {
  it("shows operators the read-only catalog without management affordances", () => {
    const html = renderCatalog("operator");

    expect(html).toContain("Zobrazit námitky");
    expect(html).not.toContain("Přidat produkt");
    expect(html).not.toContain("Upravit produkt");
    expect(html).not.toContain("Smazat produkt");
    expect(html).not.toContain("Přeřadit");
    expect(html).not.toContain("Přidat námitkovou kartu");
    expect(html).not.toContain("Synchronizovat hovory");
  });

  it("prioritizes filters and products over summary dashboard metrics", () => {
    const html = renderCatalog("operator");

    expect(html).toContain("Všechny kategorie");
    expect(html).toContain("Joint support");
    expect(html).not.toContain("Položky katalogu");
    expect(html).not.toContain("Podíl skladem");
    expect(html).not.toContain("Prodejní námitkové karty");
    expect(html).not.toContain("Celková hodnota zásob");
  });

  it("keeps management affordances for Team Leaders", () => {
    const html = renderCatalog("team_leader");

    expect(html).toContain("Přidat produkt");
    expect(html).toContain("Upravit produkt");
    expect(html).toContain("Smazat produkt");
    expect(html).toContain("Přeřadit 3 objednávku/ek");
    expect(html).toContain("Přidat námitkovou kartu");
    expect(html).toContain("Synchronizovat hovory");
  });

  it("labels unavailable objection data instead of presenting a zero count", () => {
    const html = renderCatalog("operator", {
      ...readyCatalog,
      objections: { requested: true, source: { status: "unavailable", reason: "database" } },
      state: "partial",
    });

    expect(html).toContain("Data námitkových karet nejsou dostupná");
    expect(html).not.toContain("0 argumentů proti námitkám");
  });

  it("labels unavailable order counts and omits reassignment", () => {
    const html = renderCatalog("team_leader", {
      ...readyCatalog,
      orderCounts: { requested: true, source: { status: "unavailable", reason: "database" } },
      state: "partial",
    });

    expect(html).toContain("Počty objednávek nejsou dostupné");
    expect(html).not.toContain("Přeřadit 0 objednávku/ek");
    expect(html).not.toContain("Přeřadit 3 objednávku/ek");
  });

  it("shows operators when order counts are unavailable without exposing reassignment", () => {
    const html = renderCatalog("operator", {
      ...readyCatalog,
      orderCounts: { requested: true, source: { status: "unavailable", reason: "database" } },
      state: "partial",
    });

    expect(html).toContain("Počty objednávek nejsou dostupné");
    expect(html).not.toContain("Přeřadit");
  });
});
