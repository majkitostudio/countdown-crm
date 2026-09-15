import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20260914143010_team_historical_snapshots.sql"),
  "utf8",
);
const policyMigration = fs.readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20260914143426_team_snapshot_policy_visibility.sql"),
  "utf8",
);
const callsDal = fs.readFileSync(path.resolve(__dirname, "../src/lib/dal/calls.ts"), "utf8");

describe("historical team snapshots", () => {
  it("fills the team from the lead for ordinary call and order creation", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.populate_historical_team_snapshot()");
    expect(migration).toContain("NEW.team_id := lead_team_id");
    expect(migration).toContain("BEFORE INSERT ON public.calls");
    expect(migration).toContain("BEFORE INSERT ON public.orders");
  });

  it("uses the routed queue team for post-call records", () => {
    expect(migration).toContain("queue_item.workspace_id, queue_item.team_id, queue_item.lead_id");
    expect(migration).toContain("INSERT INTO public.calls (");
    expect(migration).toContain("INSERT INTO public.orders (workspace_id, team_id, lead_id");
  });

  it("prevents historical ownership from being rewritten later", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.prevent_historical_team_snapshot_change()");
    expect(migration).toContain("Historical team snapshot cannot be changed");
    expect(migration).toContain("BEFORE UPDATE ON public.calls");
    expect(migration).toContain("BEFORE UPDATE ON public.orders");
  });

  it("does not trust a client team id for direct authenticated inserts", () => {
    expect(migration).toContain("calls.team_id IS NOT DISTINCT FROM lead.team_id");
    expect(migration).toContain("orders.team_id IS NOT DISTINCT FROM lead.team_id");
  });

  it("uses a server-side lead check that works with operator lead RLS", () => {
    expect(policyMigration).toContain("private.historical_team_matches_lead");
    expect(policyMigration).toContain("SECURITY DEFINER");
    expect(policyMigration).toContain("private.historical_team_matches_lead(workspace_id, lead_id, team_id)");
  });

  it("passes the server-resolved lead team in direct call creation", () => {
    expect(callsDal).toContain('.select("id, team_id")');
    expect(callsDal).toContain("team_id: leadTeamId");
  });
});
