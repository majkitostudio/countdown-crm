import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listSchemasForWorkspace: vi.fn(),
  listRecordsForWorkspace: vi.fn(),
  createRecordForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/schema", () => ({
  listSchemasForWorkspace: mocks.listSchemasForWorkspace,
  listRecordsForWorkspace: mocks.listRecordsForWorkspace,
  createRecordForWorkspace: mocks.createRecordForWorkspace,
  deleteSchemaForWorkspace: vi.fn(),
  saveAttributeForWorkspace: vi.fn(),
  saveSchemaForWorkspace: vi.fn(),
}));

import {
  createCustomObjectRecordAction,
  loadCustomObjectPageAction,
} from "@/app/actions/schema";
import { DataAccessError } from "@/lib/dal/errors";

const schema = {
  id: "schema-deals",
  slug: "deals",
  name: "Deals",
  description: "",
  iconName: "Database",
  attributes: [],
};

const record = {
  id: "record-1",
  schemaSlug: "deals",
  values: {},
  createdAt: "2026-08-31T10:00:00.000Z",
  updatedAt: "2026-08-31T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listSchemasForWorkspace.mockResolvedValue([schema]);
  mocks.listRecordsForWorkspace.mockResolvedValue([]);
  mocks.createRecordForWorkspace.mockResolvedValue(record);
});

describe("custom-object page action boundary", () => {
  it("maps forbidden reads to a stable failure without returning object data", async () => {
    const forbidden = new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
    mocks.listSchemasForWorkspace.mockRejectedValue(forbidden);

    await expect(loadCustomObjectPageAction("deals")).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
      status: 403,
      message: "Custom objects are unavailable for your current workspace role.",
    });
  });

  it("maps forbidden writes without returning a record", async () => {
    mocks.createRecordForWorkspace.mockRejectedValue(
      new DataAccessError("FORBIDDEN", "Insufficient workspace permissions")
    );

    await expect(createCustomObjectRecordAction("deals", {})).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
      status: 403,
      message: "Custom objects are unavailable for your current workspace role.",
    });
  });

  it("preserves allowed page data and record creation", async () => {
    await expect(loadCustomObjectPageAction("deals")).resolves.toEqual({
      ok: true,
      data: { schemas: [schema], records: [] },
    });
    await expect(createCustomObjectRecordAction("deals", { title: "Acme" })).resolves.toEqual({
      ok: true,
      data: record,
    });
  });
});
