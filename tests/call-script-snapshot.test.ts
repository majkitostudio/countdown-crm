import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { DataAccessError } from "@/lib/dal/errors";
import { resolveCallScriptSnapshot } from "@/lib/dal/productScripts";
import { createTelephonySession } from "@/lib/dal/telephonySessions";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";

const workspaceId = "5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
const product = {
  id: "57777777-7777-4777-8777-777777777777",
  workspace_id: workspaceId,
  title: "Kloubní výživa",
  category: "supplements" as const,
  price: 499,
  currency: "CZK",
  description: "Podpora pohodlí kloubů.",
  image_url: "",
  in_stock: true,
  created_at: "2026-09-07T00:00:00.000Z",
};

function queryResult(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function createClient(version: unknown) {
  const productQuery = queryResult({ data: product, error: null });
  const versionQuery = queryResult({ data: version, error: null });
  return {
    from: vi.fn((table: string) => {
      if (table === "products") return productQuery;
      if (table === "product_script_versions") return versionQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveCallScriptSnapshot", () => {
  it("captures the published version and exact safe html", async () => {
    mocks.createDataClient.mockResolvedValue(createClient({
      id: "56666666-6666-4666-8666-666666666666",
      version_number: 7,
      content_html: "<p>Approved v7</p>",
    }));

    await expect(resolveCallScriptSnapshot(product.id, workspaceId)).resolves.toMatchObject({
      source: "published_version",
      productId: product.id,
      productTitle: product.title,
      versionId: "56666666-6666-4666-8666-666666666666",
      versionNumber: 7,
      html: "<p>Approved v7</p>",
      capturedAt: expect.any(String),
    });
  });

  it("captures the exact built-in fallback when no version is published", async () => {
    mocks.createDataClient.mockResolvedValue(createClient(null));

    await expect(resolveCallScriptSnapshot(product.id, workspaceId)).resolves.toMatchObject({
      source: "built_in_fallback",
      productId: product.id,
      productTitle: product.title,
      versionId: null,
      versionNumber: null,
      html: buildDefaultScriptHtml(product),
    });
  });

  it("records unavailable when no product and no script were shown", async () => {
    await expect(resolveCallScriptSnapshot(null, workspaceId)).resolves.toMatchObject({
      source: "unavailable",
      productId: null,
      productTitle: null,
      versionId: null,
      versionNumber: null,
      html: null,
    });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("rejects a product that is not in the call workspace", async () => {
    const client = createClient(null);
    client.from.mockReturnValueOnce(queryResult({ data: null, error: null }));
    mocks.createDataClient.mockResolvedValue(client);

    await expect(resolveCallScriptSnapshot(product.id, workspaceId)).rejects.toEqual(
      new DataAccessError("NOT_FOUND", "Product is not available in this workspace."),
    );
  });
});

describe("createTelephonySession script evidence", () => {
  it("stores and returns the server-resolved snapshot", async () => {
    mocks.createDataClient.mockResolvedValue(createClient({
      id: "56666666-6666-4666-8666-666666666666",
      version_number: 7,
      content_html: "<p>Approved v7</p>",
    }));
    const single = vi.fn().mockResolvedValue({
      data: { id: "59999999-9999-4999-8999-999999999999", provider: "simulation" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert }),
    });

    const result = await createTelephonySession({
      workspaceId,
      operatorId: "53333333-3333-4333-8333-333333333333",
      provider: "simulation",
      leadId: "57777777-7777-4777-8777-777777777777",
      queueItemId: null,
      toNumber: "+420700000011",
      direction: "outbound",
      productId: product.id,
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      script_source: "published_version",
      script_product_id: product.id,
      script_product_title: product.title,
      script_version_id: "56666666-6666-4666-8666-666666666666",
      script_version_number: 7,
      script_snapshot_html: "<p>Approved v7</p>",
      script_captured_at: expect.any(String),
    }));
    expect(result).toMatchObject({
      sessionId: "59999999-9999-4999-8999-999999999999",
      provider: "simulation",
      scriptSnapshot: {
        source: "published_version",
        versionNumber: 7,
        html: "<p>Approved v7</p>",
      },
    });
  });
});
