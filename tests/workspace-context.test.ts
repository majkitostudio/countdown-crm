import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  createDataClient: vi.fn(),
  query: {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/config", () => ({ isDemoAuthEnabled: () => false }));
vi.mock("@/lib/auth/server", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));

import { DEMO_WORKSPACE_ID, requireWorkspaceContext } from "@/lib/dal/workspace";

describe("requireWorkspaceContext workspace ID validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.order.mockReturnValue(mocks.query);
    mocks.query.limit.mockReturnValue(mocks.query);
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        user_id: "user-1",
        workspace_id: DEMO_WORKSPACE_ID,
        role: "administrator",
      },
      error: null,
    });
    mocks.createDataClient.mockResolvedValue({
      from: vi.fn(() => mocks.query),
    });
  });

  it("accepts a valid PostgreSQL UUID with zero version and variant bits", async () => {
    await expect(requireWorkspaceContext(DEMO_WORKSPACE_ID)).resolves.toEqual({
      userId: "user-1",
      workspaceId: DEMO_WORKSPACE_ID,
      role: "administrator",
    });

    expect(mocks.query.eq).toHaveBeenCalledWith("workspace_id", DEMO_WORKSPACE_ID);
  });

  it("rejects values that are not in the UUID text format before querying", async () => {
    await expect(requireWorkspaceContext("not-a-uuid")).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Invalid workspace ID",
    });

    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });
});
