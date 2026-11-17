import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceRole: mocks.role }));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.client }));

import { updateWorkspaceTelephonyAdapter } from "@/lib/dal/telephonySettings";

const row = {
  workspace_id: "workspace-1",
  active_adapter: "local_sip",
  updated_by: "admin-1",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ workspaceId: "workspace-1", userId: "admin-1" });
  mocks.client.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: row, error: null });
});

describe("telephony settings DAL", () => {
  it("uses one RPC with server workspace and no actor argument", async () => {
    await expect(updateWorkspaceTelephonyAdapter("local_sip")).resolves.toEqual(row);
    expect(mocks.role).toHaveBeenCalledWith(["administrator"]);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("update_telephony_adapter_with_audit", {
      p_workspace_id: "workspace-1",
      p_adapter: "local_sip",
    });
  });

  it("rejects Telnyx before making a database request", async () => {
    await expect(updateWorkspaceTelephonyAdapter("telnyx")).rejects.toThrow("Aktivace Telnyxu");
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("reports an RPC failure instead of returning a saved setting", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "audit failure" } });
    await expect(updateWorkspaceTelephonyAdapter("local_sip")).rejects.toThrow("Telephony settings could not be saved");
  });
});
