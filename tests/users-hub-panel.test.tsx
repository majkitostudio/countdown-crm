import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UsersHubPanel } from "@/components/team/UsersHubPanel";
import type { TeamManagementData } from "@/app/actions/teams";

vi.mock("@/app/actions/teams", () => ({
  loadTeamManagementAction: vi.fn(),
  assignTeamMembershipAction: vi.fn(),
  endTeamMembershipAction: vi.fn(),
}));

vi.mock("@/app/actions/workspace", () => ({
  updateWorkspaceMemberRoleAction: vi.fn(),
  removeWorkspaceMemberAction: vi.fn(),
  inviteOrProvisionWorkspaceMemberAction: vi.fn(),
}));

const mockData: TeamManagementData = {
  teams: [
    {
      id: "team-p1",
      workspace_id: "ws-1",
      name: "Linka P1 – Hlavní prodej",
      slug: "p1",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "team-p4",
      workspace_id: "ws-1",
      name: "Linka P4 – Retargeting",
      slug: "p4",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  members: [
    {
      workspace_id: "ws-1",
      user_id: "user-admin",
      role: "administrator",
      full_name: "Hlavní Admin",
      email: "admin@countdown.cz",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      workspace_id: "ws-1",
      user_id: "user-leader",
      role: "team_leader",
      full_name: "Lucie Vedoucí",
      email: "lucie@countdown.cz",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      workspace_id: "ws-1",
      user_id: "user-operator",
      role: "operator",
      full_name: "Jan Telefonista",
      email: "jan@countdown.cz",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  memberships: {
    "team-p1": [
      {
        id: "mem-1",
        workspace_id: "ws-1",
        team_id: "team-p1",
        user_id: "user-leader",
        membership_role: "leader",
        full_name: "Lucie Vedoucí",
        email: "lucie@countdown.cz",
        avatar_url: null,
        active_from: new Date().toISOString(),
        active_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "mem-2",
        workspace_id: "ws-1",
        team_id: "team-p1",
        user_id: "user-operator",
        membership_role: "member",
        full_name: "Jan Telefonista",
        email: "jan@countdown.cz",
        avatar_url: null,
        active_from: new Date().toISOString(),
        active_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    "team-p4": [],
  },
  ownership: {
    leads: [],
    queueItems: [],
  },
};

describe("UsersHubPanel Component", () => {
  it("renders metrics cards and member list with roles and assigned lines", () => {
    const html = renderToStaticMarkup(<UsersHubPanel initialData={mockData} currentUserId="user-admin" />);

    // Metric counts
    expect(html).toContain("Celkem pracovníků");
    expect(html).toContain(">3<"); // total count
    expect(html).toContain("Operátoři");
    expect(html).toContain("Team Leadeři");
    expect(html).toContain("Administrátoři");

    // Members rendered
    expect(html).toContain("Hlavní Admin");
    expect(html).toContain("Lucie Vedoucí");
    expect(html).toContain("Jan Telefonista");

    // Emails rendered
    expect(html).toContain("admin@countdown.cz");
    expect(html).toContain("lucie@countdown.cz");
    expect(html).toContain("jan@countdown.cz");

    // Onboarding button present
    expect(html).toContain("Pozvat / Přidat pracovníka");
  });

  it("renders role selector options and team assignment options", () => {
    const html = renderToStaticMarkup(<UsersHubPanel initialData={mockData} currentUserId="user-admin" />);

    expect(html).toContain("Linka P1 – Hlavní prodej");
    expect(html).toContain("Linka P4 – Retargeting");
    expect(html).toContain("Operátor");
    expect(html).toContain("Team Leader");
    expect(html).toContain("Administrátor");
  });
});
