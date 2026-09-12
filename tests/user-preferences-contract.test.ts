import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceContext: mocks.requireWorkspaceContext }));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));

import {
  getUserPreferencesForWorkspace,
  updateUserPreferencesForWorkspace,
} from "@/lib/dal/userPreferences";

function createPreferencesClient({
  readData = null,
  readError = null,
  writeData = null,
  writeError = null,
}: {
  readData?: unknown;
  readError?: unknown;
  writeData?: unknown;
  writeError?: unknown;
} = {}) {
  const readQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: readData, error: readError }),
  };
  readQuery.select.mockReturnValue(readQuery);
  readQuery.eq.mockReturnValue(readQuery);

  const writeQuery = {
    upsert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: writeData, error: writeError }),
  };
  writeQuery.upsert.mockReturnValue(writeQuery);
  writeQuery.select.mockReturnValue(writeQuery);

  return {
    readClient: { from: vi.fn().mockReturnValue(readQuery) },
    writeClient: { from: vi.fn().mockReturnValue(writeQuery) },
    writeQuery,
  };
}

const persistedRow = {
  workspace_id: "workspace-1",
  user_id: "user-1",
  ringtone_volume: 35,
  created_at: "2026-09-06T15:00:00.000Z",
  updated_at: "2026-09-06T15:05:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceContext.mockResolvedValue({
    workspaceId: "workspace-1",
    userId: "user-1",
    role: "operator",
  });
});

describe("server-side user preferences", () => {
  it("returns explicit defaults when the account has no persisted row", async () => {
    const { readClient } = createPreferencesClient();
    mocks.createDataClient.mockResolvedValue(readClient);

    await expect(getUserPreferencesForWorkspace()).resolves.toEqual({
      workspace_id: "workspace-1",
      user_id: "user-1",
      ringtone_volume: 80,
      persisted: false,
      updated_at: null,
    });
  });

  it("returns the authenticated user's persisted workspace values", async () => {
    const { readClient } = createPreferencesClient({ readData: persistedRow });
    mocks.createDataClient.mockResolvedValue(readClient);

    await expect(getUserPreferencesForWorkspace()).resolves.toEqual({
      workspace_id: "workspace-1",
      user_id: "user-1",
      ringtone_volume: 35,
      persisted: true,
      updated_at: "2026-09-06T15:05:00.000Z",
    });
  });

  it("derives user and workspace identity from the authenticated session on save", async () => {
    const { writeClient, writeQuery } = createPreferencesClient({ writeData: persistedRow });
    mocks.createDataClient.mockResolvedValue(writeClient);

    await expect(updateUserPreferencesForWorkspace({
      ringtone_volume: 35,
    })).resolves.toMatchObject({ persisted: true, ringtone_volume: 35 });

    expect(writeQuery.upsert).toHaveBeenCalledWith({
      workspace_id: "workspace-1",
      user_id: "user-1",
      ringtone_volume: 35,
    }, { onConflict: "workspace_id,user_id" });
  });

  it.each([
    { ringtone_volume: -1 },
    { ringtone_volume: 101 },
    { ringtone_volume: Number.NaN },
  ])("rejects malformed preferences before authorization or database access: %j", async (input) => {
    await expect(updateUserPreferencesForWorkspace(input as never)).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<DataAccessError>),
    );

    expect(mocks.requireWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });
});
