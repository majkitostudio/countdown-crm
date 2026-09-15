import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260914201000_harden_direct_read_functions.sql"),
  "utf8",
);

describe("direct read function security contract", () => {
  it("moves privileged implementations out of the public schema", () => {
    expect(migration).toContain("ALTER FUNCTION public.get_workspace_order_detail(UUID) SET SCHEMA private;");
    expect(migration).toContain("ALTER FUNCTION public.list_workspace_orders(UUID) SET SCHEMA private;");
    expect(migration).toContain("ALTER FUNCTION public.get_workspace_call_review_detail(UUID) SET SCHEMA private;");
    expect(migration).toContain("ALTER FUNCTION public.get_workspace_lead_detail(UUID) SET SCHEMA private;");
    expect(migration).toContain("ALTER FUNCTION public.get_workspace_lead_activity_detail(UUID) SET SCHEMA private;");
  });

  it("keeps public RPC names as invoker wrappers", () => {
    expect(migration.match(/^SECURITY INVOKER$/gm)).toHaveLength(5);
    expect(migration).not.toMatch(/^SECURITY DEFINER$/gm);
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_workspace_order_detail(UUID) TO authenticated;");
  });
});
