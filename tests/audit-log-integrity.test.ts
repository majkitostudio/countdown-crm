import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20261118130000_lock_audit_log_writes.sql",
);

const dalPath = path.resolve(process.cwd(), "src/lib/dal/audit.ts");

describe("audit log write boundary", () => {
  const migration = readFileSync(migrationPath, "utf8");
  const dal = readFileSync(dalPath, "utf8");

  it("removes direct audit table writes from authenticated and anon", () => {
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM authenticated, anon;",
    );
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Workspace members can create audit logs" ON public.audit_logs;',
    );
    expect(migration).not.toMatch(/GRANT\s+INSERT\s+ON\s+public\.audit_logs/i);
  });

  it("keeps every legitimate audit writer working as a definer function", () => {
    for (const signature of [
      "public.update_lead_status_with_audit(UUID, UUID, TEXT)",
      "public.reassign_orders_product_with_audit(UUID, UUID, UUID)",
      "public.update_order_status_with_history(UUID, TEXT, TEXT)",
      "public.update_order_with_items(UUID, INTEGER, JSONB, TEXT, TEXT, TEXT)",
      "private.audit_team_leader_exception_action()",
      "private.audit_call_review_revision()",
    ]) {
      expect(migration).toContain(`ALTER FUNCTION ${signature}\n  SECURITY DEFINER;`);
      expect(migration).toContain(`ALTER FUNCTION ${signature}\n  SET search_path = '';`);
    }

    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.audit_call_insert()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.audit_call_order_insert()");
    expect(migration.match(/^\s*SECURITY DEFINER;?$/gm)).toHaveLength(8);
  });

  it("derives call audit attribution from the authenticated identity", () => {
    expect(migration.match(/COALESCE\(\(SELECT auth\.uid\(\)\), NEW\.agent_id\)/g)).toHaveLength(2);
    expect(migration).toContain("WHERE profile.id = actor_id");
    expect(migration).toContain("COALESCE(actor_id::TEXT, 'system')");
  });

  it("does not keep an application path for unauthenticated audit inserts", () => {
    expect(dal).not.toContain("createAuditLogForWorkspace");
    expect(dal).not.toContain("CreateAuditLogInput");
    expect(dal).not.toMatch(/\.insert\(/);
  });
});
