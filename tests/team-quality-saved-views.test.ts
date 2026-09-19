import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));

import {
  deleteSavedQualityViewForWorkspace,
  listSavedQualityViewsForWorkspace,
  saveQualityViewForWorkspace,
} from "@/lib/dal/savedViews";

const validFilters = {
  status: "review",
  signal: "all",
  outcome: "fail",
  failReason: "price",
  search: "",
};

function createListClient({ rows = null, error = null }: { rows?: unknown; error?: unknown } = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return { from: vi.fn().mockReturnValue(query), query };
}

function createUpsertClient({ row = null, error = null }: { row?: unknown; error?: unknown } = {}) {
  const query = {
    upsert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: row, error }),
  };
  query.upsert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return { from: vi.fn().mockReturnValue(query), query };
}

function createDeleteClient({ count = 1, error = null }: { count?: number | null; error?: unknown } = {}) {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    then(resolve: (value: { error: unknown; count: number | null }) => void) {
      resolve({ error, count });
    },
  };
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return { from: vi.fn().mockReturnValue(query), query };
}

const persistedRow = {
  id: "view-1",
  workspace_id: "workspace-1",
  user_id: "user-1",
  view_type: "quality",
  name: "Faily včera",
  filters: validFilters,
  created_at: "2026-09-19T09:00:00.000Z",
  updated_at: "2026-09-19T09:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue({
    workspaceId: "workspace-1",
    userId: "user-1",
    role: "team_leader",
  });
});

describe("server-side saved quality views", () => {
  it("lists only the caller's own saved views for the current workspace", async () => {
    const { from, query } = createListClient({ rows: [persistedRow] });
    mocks.createDataClient.mockResolvedValue({ from });

    await expect(listSavedQualityViewsForWorkspace()).resolves.toEqual([
      { id: "view-1", name: "Faily včera", filters: validFilters },
    ]);

    expect(query.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("view_type", "quality");
  });

  it("requires a team-leader or administrator role for every operation", async () => {
    mocks.requireWorkspaceRole.mockImplementation(() => Promise.reject(
      new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"),
    ));

    const { from } = createListClient({ rows: [] });
    const { from: upsertFrom } = createUpsertClient({ row: persistedRow });
    const { from: deleteFrom } = createDeleteClient();

    for (const client of [from, upsertFrom, deleteFrom]) {
      mocks.createDataClient.mockResolvedValue({ from: client });
      await expect(listSavedQualityViewsForWorkspace()).rejects.toEqual(
        expect.objectContaining({ code: "FORBIDDEN" } satisfies Partial<DataAccessError>),
      );
    }

    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("persists a view under the authenticated identity and returns it", async () => {
    const { from, query } = createUpsertClient({ row: persistedRow });
    mocks.createDataClient.mockResolvedValue({ from });

    await expect(saveQualityViewForWorkspace({
      name: "Faily včera",
      filters: validFilters,
    })).resolves.toEqual({ id: "view-1", name: "Faily včera", filters: validFilters });

    expect(query.upsert).toHaveBeenCalledWith({
      workspace_id: "workspace-1",
      user_id: "user-1",
      view_type: "quality",
      name: "Faily včera",
      filters: validFilters,
    }, { onConflict: "workspace_id,user_id,view_type,name" });
  });

  it.each([
    { name: "", filters: validFilters },
    { name: "x".repeat(61), filters: validFilters },
    { name: "Faily", filters: null },
    { name: "Faily", filters: { status: "nonsense", signal: "all", outcome: "all", failReason: "all", search: "" } },
    { name: "Faily", filters: { status: "all", signal: "nonsense", outcome: "all", failReason: "all", search: "" } },
    { name: "Faily", filters: { status: "all", signal: "all", outcome: "nonsense", failReason: "all", search: "" } },
    { name: "Faily", filters: { status: "all", signal: "all", outcome: "all", failReason: "nonsense", search: "" } },
    { name: "Faily", filters: { status: "all", signal: "all", outcome: "all", failReason: "all", search: "x".repeat(121) } },
  ])("rejects malformed input before authorization or database access: %j", async (input) => {
    await expect(saveQualityViewForWorkspace(input as never)).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<DataAccessError>),
    );

    expect(mocks.requireWorkspaceRole).not.toHaveBeenCalled();
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("deletes an existing view scoped to the caller and workspace", async () => {
    const { from, query } = createDeleteClient({ count: 1 });
    mocks.createDataClient.mockResolvedValue({ from });

    await expect(deleteSavedQualityViewForWorkspace("view-1")).resolves.toBeUndefined();

    expect(query.delete).toHaveBeenCalledWith({ count: "exact" });
    expect(query.eq).toHaveBeenCalledWith("id", "view-1");
    expect(query.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("reports a missing view as not found", async () => {
    const { from } = createDeleteClient({ count: 0 });
    mocks.createDataClient.mockResolvedValue({ from });

    await expect(deleteSavedQualityViewForWorkspace("missing")).rejects.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" } satisfies Partial<DataAccessError>),
    );
  });
});