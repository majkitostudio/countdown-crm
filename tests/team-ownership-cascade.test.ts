import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), "utf8");

const migration = read("supabase", "migrations", "20261015090000_team_ownership_queue_cascade.sql");
const ownershipPage = read("src", "app", "admin", "ownership", "page.tsx");
const usersPage = read("src", "app", "admin", "users", "page.tsx");
const adminHubPage = read("src", "app", "admin", "page.tsx");
const ownershipPanel = read("src", "components", "team", "TeamOwnershipPanel.tsx");
const ownershipDal = read("src", "lib", "dal", "teamOwnership.ts");

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceContext: vi.fn() }));
vi.mock("@/app/actions/teams", () => ({ loadTeamOwnershipAction: vi.fn() }));
vi.mock("@/components/team/TeamOwnershipPanel", () => ({
  TeamOwnershipPanel: () => null,
}));

import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { loadTeamOwnershipAction } from "@/app/actions/teams";
import TeamOwnershipPage from "@/app/admin/ownership/page";

describe("team ownership cascade", () => {
  it("routes the queue items of a confirmed lead instead of leaving them behind", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.assign_team_ownership_impl");
    expect(migration).toContain("queue_item.lead_id = target_resource_id");
    expect(migration).toContain("queue_item.team_id IS NULL");
  });

  it("routes the lead of a confirmed queue item", () => {
    expect(migration).toContain("WHERE id = resource_lead_id");
    expect(migration).toContain("AND team_id IS NULL");
    expect(migration).toContain("GET DIAGNOSTICS cascaded_leads = ROW_COUNT");
  });

  it("never rewrites ownership that was already confirmed", () => {
    expect(migration).not.toContain("SET state =");
    expect(migration).not.toContain("SET assigned_operator_id =");
    expect(migration).toContain("SET team_id = target_team_id, updated_at = NOW()");
  });

  it("leaves a queue item alone when its operator does not belong to the target team", () => {
    expect(migration).toContain("membership.membership_role = 'member'");
    expect(migration).toContain("member.role = 'operator'");
    expect(migration).toContain("queue_item.assigned_operator_id IS NULL");
    expect(migration).toContain("queue_item.preferred_operator_id IS NULL");
  });

  it("reports what the confirmation reached and what it left out", () => {
    expect(migration).toContain("'queue_items_updated', cascaded_queue_items");
    expect(migration).toContain("'queue_items_remaining', remaining_queue_items");
    expect(migration).toContain("'leads_updated', cascaded_leads");
  });

  it("keeps the responsive counter of unconfirmed records", () => {
    expect(ownershipDal).toContain("countUnassignedTeamOwnership");
    expect(ownershipDal).toContain('.is("team_id", null)');
  });

  it("shows what the confirmation reached in the panel", () => {
    expect(ownershipPanel).toContain("loadTeamOwnershipAction");
    expect(ownershipPanel).toContain("queue_items_remaining");
    expect(ownershipPanel).toContain("Bez přiřazení zůstává");
  });

  it("moves ownership out of Users & Teams and into the Management hub", () => {
    expect(ownershipPage).toContain("<TeamOwnershipPanel");
    expect(usersPage).not.toContain("TeamOwnershipPanel");
    expect(adminHubPage).toContain('href: "/admin/ownership"');
    expect(adminHubPage).toContain("countUnassignedTeamOwnership");
    expect(adminHubPage).toContain("bez přiřazení");
  });
});

describe("Team Ownership route boundary", () => {
  const requireWorkspaceContextMock = vi.mocked(requireWorkspaceContext);
  const loadTeamOwnershipActionMock = vi.mocked(loadTeamOwnershipAction);

  beforeEach(() => {
    vi.clearAllMocks();
    loadTeamOwnershipActionMock.mockResolvedValue({ teams: [], ownership: { leads: [], queueItems: [] } });
  });

  it("does not run the ownership loader for an operator", async () => {
    requireWorkspaceContextMock.mockResolvedValue({
      userId: "operator-1",
      workspaceId: "workspace-1",
      role: "operator",
    });

    const markup = renderToStaticMarkup(await TeamOwnershipPage());

    expect(markup).toContain("Team Ownership je dostupné pouze administrátorovi");
    expect(loadTeamOwnershipActionMock).not.toHaveBeenCalled();
  });

  it("loads ownership for an administrator", async () => {
    requireWorkspaceContextMock.mockResolvedValue({
      userId: "admin-1",
      workspaceId: "workspace-1",
      role: "administrator",
    });

    const markup = renderToStaticMarkup(await TeamOwnershipPage());

    expect(markup).toContain("Team Ownership");
    expect(loadTeamOwnershipActionMock).toHaveBeenCalledTimes(1);
  });
});
