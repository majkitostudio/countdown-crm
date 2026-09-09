import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  loadProductCatalog: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));
vi.mock("@/lib/dal/productCatalog", () => ({
  loadProductCatalog: mocks.loadProductCatalog,
}));
vi.mock("@/app/products/ProductCatalogClient", () => ({
  ProductCatalogClient: ({ role, initialCatalog }: { role: string; initialCatalog: { state: string } }) => (
    React.createElement("output", { "data-role": role, "data-state": initialCatalog.state })
  ),
}));

import ProductsPage from "@/app/products/page";
import { loadProductCatalogAction } from "@/app/actions/productCatalog";

const context = {
  userId: "leader-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const snapshot = {
  catalog: { status: "ready" as const, data: [] },
  objections: { requested: false as const, reason: "no_products" as const },
  orderCounts: { requested: false as const, reason: "no_products" as const },
  state: "ready" as const,
  isEmpty: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceContext.mockResolvedValue(context);
  mocks.loadProductCatalog.mockResolvedValue(snapshot);
});

describe("ProductsPage server boundary", () => {
  it("loads the initial snapshot with verified context and gives its role to the client catalog", async () => {
    const html = renderToStaticMarkup(await ProductsPage());

    expect(mocks.requireWorkspaceContext).toHaveBeenCalledWith();
    expect(mocks.loadProductCatalog).toHaveBeenCalledWith(context);
    expect(html).toContain('data-role="team_leader"');
    expect(html).toContain('data-state="ready"');
  });

  it("rethrows a fatal initial loader failure", async () => {
    const failure = new Error("unexpected catalog loader failure");
    mocks.loadProductCatalog.mockRejectedValue(failure);

    await expect(ProductsPage()).rejects.toBe(failure);
  });
});

describe("loadProductCatalogAction", () => {
  it("uses a current verified workspace context for each refresh", async () => {
    await expect(loadProductCatalogAction()).resolves.toBe(snapshot);

    expect(mocks.requireWorkspaceContext).toHaveBeenCalledWith();
    expect(mocks.loadProductCatalog).toHaveBeenCalledWith(context);
  });

  it("rethrows a fatal refresh loader failure", async () => {
    const failure = new Error("fatal refresh failure");
    mocks.loadProductCatalog.mockRejectedValue(failure);

    await expect(loadProductCatalogAction()).rejects.toBe(failure);
  });
});
