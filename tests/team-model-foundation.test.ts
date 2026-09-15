import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeTeamSlug } from "@/lib/teamModel";

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260914003332_team_model_foundation.sql",
);

const migration = fs.readFileSync(migrationPath, "utf8");

describe("team foundation", () => {
  it("normalizes human team slugs predictably", () => {
    expect(normalizeTeamSlug("  Moravskoslezský tým  ")).toBe("moravskoslezsky-tym");
    expect(normalizeTeamSlug("Retention / VIP")).toBe("retention-vip");
    expect(normalizeTeamSlug("---")).toBe("");
  });

  it("creates workspace-scoped teams and historical memberships", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.teams");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.team_memberships");
    expect(migration).toContain("REFERENCES public.workspace_members(workspace_id, user_id)");
    expect(migration).toContain("active_until");
    expect(migration).toContain("membership_role IN ('member', 'leader')");
  });

  it("limits active operators to one team while allowing leader scope", () => {
    expect(migration).toContain("team_memberships_one_active_operator_team_idx");
    expect(migration).toContain("membership_role = 'member' AND active_until IS NULL");
    expect(migration).toContain("private.is_team_leader");
    expect(migration).toContain("private.is_team_member");
    expect(migration).toContain("prevent_incompatible_workspace_role_change");
  });

  it("does not silently enable team scope on the existing queue", () => {
    expect(migration.replace(/\s+/g, " ")).toContain("without changing the");
    expect(migration.replace(/\s+/g, " ")).toContain("existing workspace-wide queue behavior");
    expect(migration).not.toContain("ALTER TABLE public.lead_queue_items");
    expect(migration).not.toContain("ALTER TABLE public.leads");
  });

  it("protects team records with administrator write policies", () => {
    expect(migration).toContain('CREATE POLICY "Workspace administrators can manage teams"');
    expect(migration).toContain('CREATE POLICY "Workspace administrators can manage team memberships"');
    expect(migration).toContain("private.is_workspace_admin(workspace_id)");
    expect(migration).toContain("audit_team_memberships_change");
  });
});
