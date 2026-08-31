import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

import {
  createRecordForWorkspace,
  listRecordsForWorkspace,
  listSchemasForWorkspace,
} from "@/lib/dal/schema";
import {
  createRecordAction,
  listRecordsAction,
  listSchemasAction,
} from "@/app/actions/schema";
import { DataAccessError } from "@/lib/dal/errors";

const workspaceContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const allowedRoles = ["team_leader", "administrator"] as const;
let currentRole: "operator" | "team_leader" | "administrator" = "team_leader";

function createQuery(table: string) {
  const result = Promise.resolve({
    data:
      table === "record_entities"
        ? []
        : table === "record_values"
          ? []
          : null,
    error: null,
  });
  const entity = {
    id: "record-1",
    workspace_id: "workspace-1",
    object_slug: "deals",
    created_at: "2026-08-31T10:00:00.000Z",
    updated_at: "2026-08-31T10:00:00.000Z",
  };
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: entity, error: null })),
    then: result.then.bind(result),
    catch: result.catch.bind(result),
  };

  return chain;
}

function createDataClient() {
  return {
    from: vi.fn((table: string) => createQuery(table)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentRole = "team_leader";
  mocks.createDataClient.mockResolvedValue(createDataClient());
  mocks.requireWorkspaceRole.mockImplementation(
    async (roles: readonly string[], requestedWorkspaceId?: string) => {
      expect(roles).toEqual(allowedRoles);
      expect(requestedWorkspaceId).toBe("workspace-1");
      if (!roles.includes(currentRole)) {
        throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
      }
      return { ...workspaceContext, role: currentRole };
    }
  );
});

describe("custom-object server authorization boundary", () => {
  it("rejects an Operator before schema, record, or value queries can run", async () => {
    currentRole = "operator";

    await expect(listSchemasForWorkspace("workspace-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listRecordsForWorkspace("deals", "workspace-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createRecordForWorkspace("deals", {}, "workspace-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listSchemasAction("workspace-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listRecordsAction("deals", "workspace-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createRecordAction("deals", {}, "workspace-1")).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledTimes(6);
    expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(1, allowedRoles, "workspace-1");
    expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(2, allowedRoles, "workspace-1");
    expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(3, allowedRoles, "workspace-1");
    expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(4, allowedRoles, "workspace-1");
    expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(5, allowedRoles, "workspace-1");
    expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(6, allowedRoles, "workspace-1");
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it.each(["team_leader", "administrator"] as const)(
    "allows %s to read and create custom-object data",
    async (role) => {
      currentRole = role;

      const schemas = await listSchemasForWorkspace("workspace-1");
      expect(schemas.some((schema) => schema.slug === "deals")).toBe(true);
      await expect(listRecordsForWorkspace("deals", "workspace-1")).resolves.toEqual([]);
      await expect(createRecordForWorkspace("deals", {}, "workspace-1")).resolves.toMatchObject({
        id: "record-1",
        schemaSlug: "deals",
      });
      const actionSchemas = await listSchemasAction("workspace-1");
      expect(actionSchemas.some((schema) => schema.slug === "deals")).toBe(true);
      await expect(listRecordsAction("deals", "workspace-1")).resolves.toEqual([]);
      await expect(createRecordAction("deals", {}, "workspace-1")).resolves.toMatchObject({
        id: "record-1",
        schemaSlug: "deals",
      });

      expect(mocks.requireWorkspaceRole).toHaveBeenCalledTimes(6);
      expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(1, allowedRoles, "workspace-1");
      expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(2, allowedRoles, "workspace-1");
      expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(3, allowedRoles, "workspace-1");
      expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(4, allowedRoles, "workspace-1");
      expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(5, allowedRoles, "workspace-1");
      expect(mocks.requireWorkspaceRole).toHaveBeenNthCalledWith(6, allowedRoles, "workspace-1");
      expect(mocks.createDataClient).toHaveBeenCalled();
    }
  );
});
