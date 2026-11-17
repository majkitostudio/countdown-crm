import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createAdminClient: vi.fn(),
  isDemoAuthEnabled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/auth/config", () => ({ isDemoAuthEnabled: mocks.isDemoAuthEnabled }));

import { inviteOrProvisionWorkspaceMember } from "@/lib/dal/memberships";

const input = { email: "test@example.com", fullName: "Test User", role: "operator" as const, teamId: "team-1" };
const membership = { workspace_id: "workspace-1", user_id: "user-1", role: "operator", created_at: "", updated_at: "" };

function setup(options: {
  team?: unknown; teamError?: unknown; users?: { id: string; email: string }[];
  listError?: unknown; profileError?: unknown; memberError?: unknown; teamMemberError?: unknown;
  loadError?: unknown;
} = {}) {
  const listUsers = vi.fn().mockResolvedValue({ data: { users: options.users ?? [] }, error: options.listError ?? null });
  const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  const inviteUserByEmail = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  const deleteUser = vi.fn();
  const upsert = vi.fn().mockResolvedValue({ error: options.profileError ?? null });
  const insertMember = vi.fn().mockResolvedValue({ error: options.memberError ?? null });
  const insertTeam = vi.fn().mockResolvedValue({ error: options.teamMemberError ?? null });
  let memberReads = 0;
  const from = vi.fn((table: string) => {
    const query = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert, insert: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    if (table === "teams") query.maybeSingle.mockResolvedValue({ data: options.team === undefined ? { id: "team-1" } : options.team, error: options.teamError ?? null });
    if (table === "workspace_members") {
      query.insert = insertMember;
      query.maybeSingle.mockImplementation(async () => {
        memberReads++;
        return memberReads === 1 && (options.users?.length ?? 0) > 0
          ? { data: null, error: null }
          : { data: options.loadError ? null : membership, error: options.loadError ?? null };
      });
    }
    if (table === "profiles") query.maybeSingle.mockResolvedValue({ data: { full_name: "Test User", email: input.email, avatar_url: null }, error: null });
    if (table === "team_memberships") query.insert = insertTeam;
    return query;
  });
  mocks.createAdminClient.mockReturnValue({ from, auth: { admin: { listUsers, createUser, inviteUserByEmail, deleteUser } } });
  return { from, listUsers, createUser, inviteUserByEmail, deleteUser, upsert, insertMember, insertTeam };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue({ workspaceId: "workspace-1", userId: "admin", role: "administrator" });
  mocks.isDemoAuthEnabled.mockReturnValue(false);
});

describe("worker provisioning", () => {
  it.each([
    [{ team: null }, "Vybraný tým"],
    [{ teamError: { message: "denied" } }, "ověřit vybraný tým"],
  ])("rejects an invalid or inaccessible team before Auth", async (options, message) => {
    const calls = setup(options);
    await expect(inviteOrProvisionWorkspaceMember(input)).rejects.toThrow(message);
    expect(calls.listUsers).not.toHaveBeenCalled();
    expect(calls.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("attaches an existing account without overwriting its global profile", async () => {
    const calls = setup({ users: [{ id: "user-1", email: input.email }] });
    const result = await inviteOrProvisionWorkspaceMember(input);
    expect(result.action).toBe("attached");
    expect(result.assignedTeamId).toBe("team-1");
    expect(calls.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), { onConflict: "id", ignoreDuplicates: true });
    expect(calls.createUser).not.toHaveBeenCalled();
    expect(calls.inviteUserByEmail).not.toHaveBeenCalled();
    expect(calls.deleteUser).not.toHaveBeenCalled();
  });

  it("does not create an account when lookup fails", async () => {
    const calls = setup({ listError: { message: "failed" } });
    await expect(inviteOrProvisionWorkspaceMember(input)).rejects.toThrow("ověřit existující účet");
    expect(calls.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it.each([
    [{ profileError: { message: "denied" } }, "profil se nepodařilo", "profile"],
    [{ memberError: { message: "denied" } }, "člena se nepodařilo", "member"],
    [{ teamMemberError: { message: "denied" } }, "nepodařilo se jej přiřadit do týmu", "team"],
    [{ loadError: { message: "denied" } }, "údaje se nepodařilo načíst", "load"],
  ])("reports partial failure without deleting the account", async (options, message, stage) => {
    const calls = setup(options);
    await expect(inviteOrProvisionWorkspaceMember(input)).rejects.toThrow(message);
    expect(calls.deleteUser).not.toHaveBeenCalled();
    if (stage === "profile") expect(calls.insertMember).not.toHaveBeenCalled();
    if (stage === "member") expect(calls.insertTeam).not.toHaveBeenCalled();
  });

  it("finds an existing user beyond the first page", async () => {
    const calls = setup({ users: [{ id: "user-1", email: input.email }] });
    calls.listUsers.mockResolvedValueOnce({ data: { users: Array.from({ length: 1000 }, (_, i) => ({ id: `${i}`, email: `${i}@example.com` })) }, error: null })
      .mockResolvedValueOnce({ data: { users: [{ id: "user-1", email: input.email }] }, error: null });
    await inviteOrProvisionWorkspaceMember(input);
    expect(calls.listUsers).toHaveBeenCalledTimes(2);
    expect(calls.inviteUserByEmail).not.toHaveBeenCalled();
  });
});
