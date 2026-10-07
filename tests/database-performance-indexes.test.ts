import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Database Performance Composite Indexes Contract", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20261006120000_performance_composite_indexes.sql",
  );

  it("ensures performance indexes migration exists", () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  it("defines composite order/created_at indexes for calls and orders", () => {
    const migrationContent = readFileSync(migrationPath, "utf8");

    expect(migrationContent).toContain("calls (workspace_id, created_at DESC)");
    expect(migrationContent).toContain("calls (agent_id, created_at DESC)");
    expect(migrationContent).toContain("orders (workspace_id, created_at DESC)");
    expect(migrationContent).toContain("orders (agent_id, created_at DESC)");
    expect(migrationContent).toContain("leads (workspace_id, created_at DESC)");
    expect(migrationContent).toContain("leads (workspace_id, status)");
    expect(migrationContent).toContain("lead_queue_items (assigned_operator_id, state)");
  });
});
