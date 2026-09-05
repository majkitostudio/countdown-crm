import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readLocalTelephonyMigration() {
  const migrationName = readdirSync(join(process.cwd(), "supabase", "migrations")).find((file) =>
    file.endsWith("_local_telephony_adapter.sql"),
  );

  if (!migrationName) {
    throw new Error("local telephony adapter migration was not generated");
  }

  return readFileSync(join(process.cwd(), "supabase", "migrations", migrationName), "utf8").toLowerCase();
}

describe("workspace telephony settings migration", () => {
  it("stores one workspace-scoped adapter with simulation as the safe default", () => {
    const migration = readLocalTelephonyMigration();

    expect(migration).toContain("create table if not exists public.workspace_telephony_settings");
    expect(migration).toContain("workspace_id uuid primary key");
    expect(migration).toContain("active_adapter text not null default 'simulation'");
    expect(migration).toContain("simulation");
    expect(migration).toContain("local_sip");
    expect(migration).toContain("telnyx");
    expect(migration).toContain("updated_by uuid");
    expect(migration).toContain("enable row level security");
  });

  it("keeps session provider call IDs unique without changing existing Telnyx columns", () => {
    const migration = readLocalTelephonyMigration();

    expect(migration).toContain("add column if not exists provider_call_id text");
    expect(migration).toContain("on public.telephony_call_sessions (provider, provider_call_id)");
    expect(migration).toContain("where provider_call_id is not null");
    expect(migration).toContain("telephony_call_sessions");
  });

  it("limits settings writes to workspace administrators", () => {
    const migration = readLocalTelephonyMigration();

    expect(migration).toContain("workspace_telephony_settings_admin_insert");
    expect(migration).toContain("workspace_telephony_settings_admin_update");
    expect(migration).toContain("private.is_workspace_admin");
  });
});
