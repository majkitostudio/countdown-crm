import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260914190000_direct_detail_access.sql"),
  "utf8",
);
const activitySource = readFileSync(resolve(process.cwd(), "src/lib/dal/activity.ts"), "utf8");
const reviewSource = readFileSync(resolve(process.cwd(), "src/lib/dal/callReviews.ts"), "utf8");

 describe("direct detail access contract", () => {
  it("keeps order list visibility team-scoped", () => {
    expect(migration).toContain("private.can_list_order(workspace_id, id)");
    expect(migration).toContain("private.is_team_member(order_row.team_id)");
    expect(migration).not.toContain("private.is_workspace_member(workspace_id)\n  );");
  });

  it("uses a separate controlled read for direct order details", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_workspace_order_detail");
    expect(migration).toContain("private.can_view_direct_workspace_order");
    expect(activitySource).toContain('rpc("get_workspace_order_detail"');
  });

  it("uses a separate controlled read for direct call reviews", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_workspace_call_review_detail");
    expect(migration).toContain("private.can_view_direct_workspace_call_review");
    expect(reviewSource).toContain('rpc("get_workspace_call_review_detail"');
  });

  it("does not give operators review mutation rights", () => {
    expect(reviewSource).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
  });
});
