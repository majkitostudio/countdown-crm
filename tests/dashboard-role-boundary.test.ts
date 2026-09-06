import { describe, expect, it, vi } from "vitest";

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

import DashboardPage from "@/app/dashboard/page";

describe("manager dashboard role boundary", () => {
  it("returns an operator to the operator home without a server error", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue({
      userId: "operator-1",
      workspaceId: "workspace-1",
      role: "operator",
    });

    await DashboardPage();

    expect(mocks.redirect).toHaveBeenCalledWith("/workspace");
  });
});
