import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260827005441_server_authoritative_blueprint_apply.sql", import.meta.url),
  "utf8",
);
const prerequisiteMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260830100000_blueprint_leads_object_prerequisite.sql",
    import.meta.url,
  ),
  "utf8",
);
const engine = readFileSync(new URL("../src/lib/blueprints/engine.ts", import.meta.url), "utf8");

describe("server-authoritative blueprint application", () => {
  it("protects the state table with workspace membership and manager policies", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("private.is_workspace_member(workspace_id)");
    expect(migration).toContain("private.is_workspace_manager_or_admin(workspace_id)");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.apply_blueprint_for_workspace");
  });

  it("applies schema metadata and active state in one idempotent transaction", () => {
    expect(migration).toContain("ON CONFLICT (object_slug, slug) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (workspace_id) DO UPDATE");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("RETURN QUERY SELECT p_blueprint_id");
  });

  it("provisions only the built-in Leads metadata prerequisite", () => {
    expect(prerequisiteMigration).toContain("INSERT INTO public.custom_objects");
    expect(prerequisiteMigration).toContain("'leads'");
    expect(prerequisiteMigration).toContain("WHERE NOT EXISTS");
    expect(prerequisiteMigration).not.toContain("INSERT INTO public.leads");
  });

  it("updates the browser cache only after the server confirms persistence", () => {
    expect(engine).toContain("const result = await applyBlueprintAction(blueprintId)");
    expect(engine.indexOf("const result = await applyBlueprintAction(blueprintId)")).toBeLessThan(
      engine.indexOf("this.activeBlueprintId = blueprintId"),
    );
    expect(engine).not.toContain("workflowEngine");
    expect(engine).not.toContain("saveAttributeAction");
    expect(engine).toContain("hydrateFromServer");
  });
});
