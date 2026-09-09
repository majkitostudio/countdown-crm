import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  listProductsForWorkspace: vi.fn(),
  listObjectionsForWorkspace: vi.fn(),
  listOrderProductCountsForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/products", () => ({
  listProductsForWorkspace: mocks.listProductsForWorkspace,
}));
vi.mock("@/lib/dal/objections", () => ({
  listObjectionsForWorkspace: mocks.listObjectionsForWorkspace,
}));
vi.mock("@/lib/dal/orders", () => ({
  listOrderProductCountsForWorkspace: mocks.listOrderProductCountsForWorkspace,
}));

import { loadProductCatalog } from "@/lib/dal/productCatalog";

const context = {
  userId: "leader-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const productDto = {
  id: "product-1",
  workspace_id: "workspace-1",
  title: "Joint support",
  category: "supplements" as const,
  price: 499,
  currency: "CZK",
  description: "Supports comfortable movement.",
  image_url: null,
  in_stock: true,
  created_at: "2026-09-08T10:00:00.000Z",
};

const objection = {
  id: "objection-1",
  workspace_id: "workspace-1",
  product_id: "product-1",
  objection_title: "Too expensive",
  rebuttal_args: ["Emphasize the warranty."],
  created_at: "2026-09-08T10:30:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listProductsForWorkspace.mockResolvedValue([productDto]);
  mocks.listObjectionsForWorkspace.mockResolvedValue([objection]);
  mocks.listOrderProductCountsForWorkspace.mockResolvedValue({ "product-1": 3 });
});

describe("loadProductCatalog", () => {
  it("returns verified product and enrichment data as ready", async () => {
    await expect(loadProductCatalog(context)).resolves.toEqual({
      catalog: {
        status: "ready",
        data: [{
          id: "product-1",
          title: "Joint support",
          category: "supplements",
          price: 499,
          currency: "CZK",
          description: "Supports comfortable movement.",
          image_url: "",
          in_stock: true,
          created_at: "2026-09-08T10:00:00.000Z",
        }],
      },
      objections: { requested: true, source: { status: "ready", data: [objection] } },
      orderCounts: { requested: true, source: { status: "ready", data: { "product-1": 3 } } },
      state: "ready",
      isEmpty: false,
    });

    expect(mocks.listProductsForWorkspace).toHaveBeenCalledWith({ workspaceId: "workspace-1" });
    expect(mocks.listObjectionsForWorkspace).toHaveBeenCalledWith({ workspaceId: "workspace-1" });
    expect(mocks.listOrderProductCountsForWorkspace).toHaveBeenCalledWith("workspace-1");
  });

  it("keeps ready products and order counts when objections are database-unavailable", async () => {
    mocks.listObjectionsForWorkspace.mockRejectedValue(
      new DataAccessError("DATABASE", "Unable to load objection cards."),
    );

    await expect(loadProductCatalog(context)).resolves.toMatchObject({
      catalog: { status: "ready", data: [{ id: "product-1" }] },
      objections: { requested: true, source: { status: "unavailable", reason: "database" } },
      orderCounts: { requested: true, source: { status: "ready", data: { "product-1": 3 } } },
      state: "partial",
      isEmpty: false,
    });
  });

  it("keeps ready products and objections when order counts are database-unavailable", async () => {
    mocks.listOrderProductCountsForWorkspace.mockRejectedValue(
      new DataAccessError("DATABASE", "Unable to load order product counts."),
    );

    await expect(loadProductCatalog(context)).resolves.toMatchObject({
      catalog: { status: "ready", data: [{ id: "product-1" }] },
      objections: { requested: true, source: { status: "ready", data: [objection] } },
      orderCounts: { requested: true, source: { status: "unavailable", reason: "database" } },
      state: "partial",
      isEmpty: false,
    });
  });

  it("reports both enrichments unavailable without inventing empty values", async () => {
    mocks.listObjectionsForWorkspace.mockRejectedValue(new DataAccessError("DATABASE", "objections failed"));
    mocks.listOrderProductCountsForWorkspace.mockRejectedValue(new DataAccessError("DATABASE", "counts failed"));

    await expect(loadProductCatalog(context)).resolves.toMatchObject({
      catalog: { status: "ready", data: [{ id: "product-1" }] },
      objections: { requested: true, source: { status: "unavailable", reason: "database" } },
      orderCounts: { requested: true, source: { status: "unavailable", reason: "database" } },
      state: "partial",
      isEmpty: false,
    });
  });

  it("reports a database-unavailable primary catalog and skips enrichment", async () => {
    mocks.listProductsForWorkspace.mockRejectedValue(new DataAccessError("DATABASE", "products failed"));

    await expect(loadProductCatalog(context)).resolves.toEqual({
      catalog: { status: "unavailable", reason: "database" },
      objections: { requested: false, reason: "catalog_unavailable" },
      orderCounts: { requested: false, reason: "catalog_unavailable" },
      state: "unavailable",
      isEmpty: false,
    });

    expect(mocks.listObjectionsForWorkspace).not.toHaveBeenCalled();
    expect(mocks.listOrderProductCountsForWorkspace).not.toHaveBeenCalled();
  });

  it("treats an empty ready catalog as empty and skips enrichment", async () => {
    mocks.listProductsForWorkspace.mockResolvedValue([]);

    await expect(loadProductCatalog(context)).resolves.toEqual({
      catalog: { status: "ready", data: [] },
      objections: { requested: false, reason: "no_products" },
      orderCounts: { requested: false, reason: "no_products" },
      state: "ready",
      isEmpty: true,
    });

    expect(mocks.listObjectionsForWorkspace).not.toHaveBeenCalled();
    expect(mocks.listOrderProductCountsForWorkspace).not.toHaveBeenCalled();
  });

  it.each([
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION",
    "CONFLICT",
  ] as const)("rethrows a fatal %s primary-source error", async (code) => {
    const failure = new DataAccessError(code, `${code} products failure`);
    mocks.listProductsForWorkspace.mockRejectedValue(failure);

    await expect(loadProductCatalog(context)).rejects.toBe(failure);
    expect(mocks.listObjectionsForWorkspace).not.toHaveBeenCalled();
    expect(mocks.listOrderProductCountsForWorkspace).not.toHaveBeenCalled();
  });

  it("rethrows an unknown primary-source error", async () => {
    const failure = new Error("unexpected product source failure");
    mocks.listProductsForWorkspace.mockRejectedValue(failure);

    await expect(loadProductCatalog(context)).rejects.toBe(failure);
  });

  it.each([
    new DataAccessError("FORBIDDEN", "objections forbidden"),
    new Error("unexpected order-count failure"),
  ])("rethrows fatal enrichment errors", async (failure) => {
    mocks.listObjectionsForWorkspace.mockRejectedValue(failure);

    await expect(loadProductCatalog(context)).rejects.toBe(failure);
  });
});
