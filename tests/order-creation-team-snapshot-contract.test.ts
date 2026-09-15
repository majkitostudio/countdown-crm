import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915011000_order_creation_team_snapshot_fix.sql"),
  "utf8",
);

describe("manual order team snapshot contract", () => {
  it("resolves the lead team before the order write", () => {
    expect(migration).toContain("private.lead_team_id_for_order");
    expect(migration).toContain("v_team_id := private.lead_team_id_for_order(p_workspace_id, p_lead_id);");
    expect(migration).toMatch(/workspace_id,\s+team_id,\s+lead_id,/);
  });

  it("keeps the authenticated write boundary explicit", () => {
    expect(migration.match(/SECURITY DEFINER/g)).toHaveLength(3);
    expect(migration).toContain("IF NOT private.can_create_order_for_lead(p_workspace_id, p_lead_id)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.create_order_with_items");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.create_order_with_items");
  });

  it("saves and returns the complete delivery snapshot", () => {
    expect(migration).toContain("p_delivery_address_snapshot JSONB");
    expect(migration).toContain("SET delivery_address_snapshot = p_delivery_address_snapshot");
    expect(migration).toContain("RETURN QUERY");
    expect(migration).toContain("AND agent_id = (SELECT auth.uid())");
  });
});
