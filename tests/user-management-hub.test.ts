import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  inviteOrProvisionWorkspaceMember,
  type InviteOrProvisionMemberInput,
} from "@/lib/dal/memberships";

const mockAdminClient = {
  auth: {
    admin: {
      listUsers: vi.fn(),
      createUser: vi.fn(),
      inviteUserByEmail: vi.fn(),
    },
  },
  from: vi.fn(),
};

vi.mock("@/lib/auth/config", () => ({
  isDemoAuthEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: vi.fn(async () => ({
    userId: "admin-1",
    workspaceId: "00000000-0000-0000-0000-000000000001",
    role: "administrator" as const,
  })),
  requireWorkspaceContext: vi.fn(async () => ({
    userId: "admin-1",
    workspaceId: "00000000-0000-0000-0000-000000000001",
    role: "administrator" as const,
  })),
}));

vi.mock("@/lib/dal/db", () => ({
  createDataClient: vi.fn(async () => mockAdminClient),
}));

describe("User Management Hub & Provisioning DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid emails and empty full names", async () => {
    const invalidEmailInput: InviteOrProvisionMemberInput = {
      email: "not-an-email",
      fullName: "Jan Novák",
      role: "operator",
    };

    await expect(inviteOrProvisionWorkspaceMember(invalidEmailInput)).rejects.toThrow(
      "Zadejte platnou e-mailovou adresu.",
    );

    const invalidNameInput: InviteOrProvisionMemberInput = {
      email: "operator@countdown.cz",
      fullName: "J",
      role: "operator",
    };

    await expect(inviteOrProvisionWorkspaceMember(invalidNameInput)).rejects.toThrow(
      "Jméno a příjmení musí mít 2 až 100 znaků.",
    );
  });

  it("requires minimum 8 character password when deliveryMethod is password", async () => {
    const shortPasswordInput: InviteOrProvisionMemberInput = {
      email: "operator@countdown.cz",
      fullName: "Jan Novák",
      role: "operator",
      deliveryMethod: "password",
      password: "short",
    };

    await expect(inviteOrProvisionWorkspaceMember(shortPasswordInput)).rejects.toThrow(
      "Heslo musí obsahovat alespoň 8 znaků.",
    );
  });

  it("successfully invites a new user by email via Supabase Auth admin", async () => {
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-uuid", email: "novak@countdown.cz" } },
      error: null,
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "workspace_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              workspace_id: "00000000-0000-0000-0000-000000000001",
              user_id: "new-user-uuid",
              role: "operator",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "profiles") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "new-user-uuid",
              full_name: "Jan Novák",
              email: "novak@countdown.cz",
              avatar_url: null,
            },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    const result = await inviteOrProvisionWorkspaceMember({
      email: "novak@countdown.cz",
      fullName: "Jan Novák",
      role: "operator",
      deliveryMethod: "invite",
    });

    expect(result.action).toBe("invited");
    expect(result.member.email).toBe("novak@countdown.cz");
    expect(result.member.role).toBe("operator");
    expect(mockAdminClient.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "novak@countdown.cz",
      { data: { full_name: "Jan Novák" } },
    );
  });

  it("creates a new user directly with a password when deliveryMethod is password", async () => {
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "created-user-uuid", email: "leader@countdown.cz" } },
      error: null,
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "workspace_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              workspace_id: "00000000-0000-0000-0000-000000000001",
              user_id: "created-user-uuid",
              role: "team_leader",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "profiles") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "created-user-uuid",
              full_name: "Petr Vedoucí",
              email: "leader@countdown.cz",
              avatar_url: null,
            },
            error: null,
          }),
        };
      }
      if (table === "teams") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "team-p1-uuid" },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    const result = await inviteOrProvisionWorkspaceMember({
      email: "leader@countdown.cz",
      fullName: "Petr Vedoucí",
      role: "team_leader",
      teamId: "team-p1-uuid",
      deliveryMethod: "password",
      password: "StrongPassword123",
    });

    expect(result.action).toBe("created");
    expect(result.member.email).toBe("leader@countdown.cz");
    expect(result.member.role).toBe("team_leader");
    expect(result.assignedTeamId).toBe("team-p1-uuid");
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith({
      email: "leader@countdown.cz",
      password: "StrongPassword123",
      email_confirm: true,
      user_metadata: { full_name: "Petr Vedoucí" },
    });
  });
});
