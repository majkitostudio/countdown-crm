import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireWorkspaceContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));

import Home from "@/app/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("role-aware home routing", () => {
  it.each([
    ["operator", "/workspace"],
    ["team_leader", "/exceptions"],
    ["administrator", "/readiness"],
  ] as const)("sends %s to %s", async (role, destination) => {
    mocks.requireWorkspaceContext.mockResolvedValue({
      userId: "user-1",
      workspaceId: "workspace-1",
      role,
    });

    await Home();

    expect(mocks.redirect).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith(destination);
  });
});
