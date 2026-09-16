import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260916180000_team_assistance_requests.sql", "utf8");
const eventMigration = readFileSync("supabase/migrations/20260916181000_team_assistance_request_event_insert.sql", "utf8");
const dal = readFileSync("src/lib/dal/assistanceRequests.ts", "utf8");
const action = readFileSync("src/app/actions/assistance.ts", "utf8");
const operatorHeader = readFileSync("src/components/workspace/OperatorLeadHeader.tsx", "utf8");
const teamPanel = readFileSync("src/components/team/TeamAssistancePanel.tsx", "utf8");

describe("team assistance signal", () => {
  it("stores a small, auditable request with open/claimed/resolved states", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.team_assistance_requests");
    expect(migration).toContain("request_type TEXT NOT NULL CHECK (request_type IN ('help', 'sos'))");
    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'open'");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.team_assistance_request_events");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.claim_team_assistance_request");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.resolve_team_assistance_request");
  });

  it("allows managers to see workspace assistance without granting management data access", () => {
    expect(migration).toContain("private.is_workspace_manager_or_admin(workspace_id)");
    expect(migration).toContain("Operators can create own assistance requests");
    expect(dal).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
    expect(dal).toContain('requireWorkspaceRole(["operator"])');
    expect(eventMigration).toContain("Participants can create assistance request events");
  });

  it("offers the simple operator signal and manager actions", () => {
    expect(action).toContain("requestAssistanceAction");
    expect(operatorHeader).toContain("Request Help");
    expect(operatorHeader).toContain('onRequestHelp("sos")');
    expect(operatorHeader).toContain("const assistanceControls");
    expect(operatorHeader).toContain("{assistanceControls}");
    expect(teamPanel).toContain("Co vyžaduje pozornost");
    expect(teamPanel).toContain("Přebírám");
    expect(teamPanel).toContain("Vyřešeno");
  });
});
