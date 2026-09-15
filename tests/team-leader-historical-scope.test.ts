import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20260914144701_team_leader_historical_scope.sql"),
  "utf8",
);

describe("Team Leader historical scope", () => {
  it("limits call reads to the leader's active teams or the operator's own calls", () => {
    expect(migration).toContain('CREATE POLICY "Workspace roles can view permitted calls"');
    expect(migration).toContain("private.can_manage_team_resource(workspace_id, team_id)");
    expect(migration).toContain("agent_id = (SELECT auth.uid())");
  });

  it("limits order reads to the leader's active teams or the operator's own orders", () => {
    expect(migration).toContain('CREATE POLICY "Workspace roles can view permitted orders"');
    expect(migration).toContain("private.can_manage_team_resource(workspace_id, team_id)");
  });

  it("uses the same team boundary for order details and history", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.can_access_order(");
    expect(migration).toContain("private.can_manage_team_resource(order_row.workspace_id, order_row.team_id)");
  });

  it("uses the reviewed call team for review revisions", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.can_access_call_review(");
    expect(migration).toContain("private.can_access_call_review(workspace_id, call_id)");
  });

  it("scopes provider sessions through their completed call or queue item", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.can_access_telephony_session(");
    expect(migration).toContain("private.can_manage_team_resource(completed_call.workspace_id, completed_call.team_id)");
    expect(migration).toContain("private.can_manage_team_resource(queue_item.workspace_id, queue_item.team_id)");
  });
});
