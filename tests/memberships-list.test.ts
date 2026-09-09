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

import * as membershipsDal from "@/lib/dal/memberships";

type MembershipRow = {
  workspace_id: string;
  user_id: string;
  role: "administrator" | "team_leader" | "operator";
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type QueryResult = {
  data: unknown;
  error: unknown;
};

const membershipOne: MembershipRow = {
  workspace_id: "workspace-requested",
  user_id: "user-1",
  role: "administrator",
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-02T10:00:00.000Z",
};

const membershipTwo: MembershipRow = {
  workspace_id: "workspace-requested",
  user_id: "user-2",
  role: "operator",
  created_at: "2026-09-03T10:00:00.000Z",
  updated_at: "2026-09-04T10:00:00.000Z",
};

function mergeMembershipProfiles(
  memberships: MembershipRow[],
  profiles: ProfileRow[],
) {
  const merge = (
    membershipsDal as unknown as {
      mergeMembershipProfiles: (
        membershipRows: MembershipRow[],
        profileRows: ProfileRow[],
      ) => membershipsDal.WorkspaceMemberDTO[];
    }
  ).mergeMembershipProfiles;

  return merge(memberships, profiles);
}

function createMembershipQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function createProfileQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  return query;
}

function createListClient({
  memberships = [],
  membershipError = null,
  profiles = [],
  profileError = null,
}: {
  memberships?: MembershipRow[];
  membershipError?: unknown;
  profiles?: ProfileRow[];
  profileError?: unknown;
} = {}) {
  const membershipQuery = createMembershipQuery({
    data: memberships,
    error: membershipError,
  });
  const profileQuery = createProfileQuery({ data: profiles, error: profileError });
  const from = vi.fn((table: string) => {
    if (table === "workspace_members") return membershipQuery;
    if (table === "profiles") return profileQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { client: { from }, from, membershipQuery, profileQuery };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue({
    workspaceId: "workspace-requested",
    userId: "current-user",
    role: "administrator",
  });
});

describe("workspace membership profile hydration", () => {
  // Production break caught: a missing profile drops an authoritative membership or profile fields overwrite membership identity and role.
  it("merges verified profile fields while retaining every authoritative membership", () => {
    const profiles = [
      {
        id: "user-1",
        full_name: "  Ada Admin  ",
        email: "  ada@example.com  ",
        avatar_url: "https://example.com/ada.png",
        role: "operator",
        workspace_id: "workspace-from-profile",
      },
    ];

    expect(mergeMembershipProfiles([membershipOne, membershipTwo], profiles)).toEqual([
      {
        ...membershipOne,
        full_name: "Ada Admin",
        email: "ada@example.com",
        avatar_url: "https://example.com/ada.png",
      },
      {
        ...membershipTwo,
        full_name: "Unknown operator",
        email: "",
        avatar_url: null,
      },
    ]);
  });

  // Production break caught: the all-members path performs N+1 reads, loses rows with missing profiles, or authorizes against the wrong workspace.
  it("lists all members with one workspace query and one batched profile query", async () => {
    const { client, from, membershipQuery, profileQuery } = createListClient({
      memberships: [membershipOne, membershipTwo],
      profiles: [
        {
          id: "user-1",
          full_name: "Ada Admin",
          email: "ada@example.com",
          avatar_url: null,
        },
      ],
    });
    mocks.createDataClient.mockResolvedValue(client);

    await expect(
      membershipsDal.listWorkspaceMembers("workspace-requested"),
    ).resolves.toEqual([
      {
        ...membershipOne,
        full_name: "Ada Admin",
        email: "ada@example.com",
        avatar_url: null,
      },
      {
        ...membershipTwo,
        full_name: "Unknown operator",
        email: "",
        avatar_url: null,
      },
    ]);

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledOnce();
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(
      ["administrator"],
      "workspace-requested",
    );
    expect(from).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenNthCalledWith(1, "workspace_members");
    expect(from).toHaveBeenNthCalledWith(2, "profiles");
    expect(membershipQuery.eq).toHaveBeenCalledOnce();
    expect(membershipQuery.eq).toHaveBeenCalledWith(
      "workspace_id",
      "workspace-requested",
    );
    expect(profileQuery.in).toHaveBeenCalledOnce();
    expect(profileQuery.in).toHaveBeenCalledWith("id", ["user-1", "user-2"]);
  });

  // Production break caught: the operator path omits its role filter, performs per-row reads, or loses explicit workspace scope.
  it("lists operators with the manager role boundary and one batched profile query", async () => {
    const operatorMembership = { ...membershipOne, role: "operator" as const };
    const { client, from, membershipQuery, profileQuery } = createListClient({
      memberships: [operatorMembership],
      profiles: [
        {
          id: "user-1",
          full_name: "Op One",
          email: "op@example.com",
          avatar_url: null,
        },
      ],
    });
    mocks.createDataClient.mockResolvedValue(client);

    await expect(
      membershipsDal.listWorkspaceOperators("workspace-requested"),
    ).resolves.toEqual([
      {
        ...operatorMembership,
        full_name: "Op One",
        email: "op@example.com",
        avatar_url: null,
      },
    ]);

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledOnce();
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(
      ["team_leader", "administrator"],
      "workspace-requested",
    );
    expect(from).toHaveBeenCalledTimes(2);
    expect(membershipQuery.eq).toHaveBeenNthCalledWith(
      1,
      "workspace_id",
      "workspace-requested",
    );
    expect(membershipQuery.eq).toHaveBeenNthCalledWith(2, "role", "operator");
    expect(profileQuery.in).toHaveBeenCalledOnce();
    expect(profileQuery.in).toHaveBeenCalledWith("id", ["user-1"]);
  });

  // Production break caught: a failed membership query is treated as an empty successful list or triggers a profile query.
  it("throws DATABASE when the membership query fails", async () => {
    const { client, from, profileQuery } = createListClient({
      membershipError: { message: "membership query failed" },
    });
    mocks.createDataClient.mockResolvedValue(client);

    await expect(
      membershipsDal.listWorkspaceMembers("workspace-requested"),
    ).rejects.toMatchObject({
      code: "DATABASE",
      message: "Workspace members could not be loaded",
    });

    expect(from).toHaveBeenCalledTimes(1);
    expect(profileQuery.in).not.toHaveBeenCalled();
  });

  // Production break caught: a failed batched profile query is silently downgraded to fallback identities.
  it("throws DATABASE when the profile query fails", async () => {
    const { client, from, profileQuery } = createListClient({
      memberships: [membershipOne],
      profileError: { message: "profile query failed" },
    });
    mocks.createDataClient.mockResolvedValue(client);

    await expect(
      membershipsDal.listWorkspaceMembers("workspace-requested"),
    ).rejects.toMatchObject({
      code: "DATABASE",
      message: "Workspace member profiles could not be loaded",
    });

    expect(from).toHaveBeenCalledTimes(2);
    expect(profileQuery.in).toHaveBeenCalledOnce();
  });

  // Production break caught: an empty membership result performs an unnecessary profile read or returns a non-empty value.
  it("returns an empty list without querying profiles", async () => {
    const { client, from, profileQuery } = createListClient();
    mocks.createDataClient.mockResolvedValue(client);

    await expect(
      membershipsDal.listWorkspaceMembers("workspace-requested"),
    ).resolves.toEqual([]);

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("workspace_members");
    expect(profileQuery.in).not.toHaveBeenCalled();
  });
});
