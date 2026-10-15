import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), "utf8");
const exists = (...segments: string[]) => fs.existsSync(path.join(root, ...segments));

const migration = read("supabase", "migrations", "20261015091000_lead_queue_enqueue_on_insert.sql");

const fixtures = [
  "call_completion_rpc_authorization_test.sql",
  "team_leader_exception_queue_rls_test.sql",
  "team_ownership_assignment_test.sql",
].map((file) => ({ file, sql: read("supabase", "tests", "database", file) }));

describe("new leads enter the queue automatically", () => {
  it("queues the lead through a trigger on the lead itself", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.enqueue_lead_queue_item()");
    expect(migration).toContain("CREATE TRIGGER leads_enqueue_queue_item");
    expect(migration).toContain("AFTER INSERT ON public.leads");
    expect(migration).toContain("EXECUTE FUNCTION private.enqueue_lead_queue_item()");
  });

  it("keeps one queue item per lead and never rewrites queue state", () => {
    expect(migration).toContain("ON CONFLICT (workspace_id, lead_id) DO NOTHING");
    expect(migration).not.toContain("DO UPDATE");
    expect(migration).not.toContain("SET state =");
    expect(migration).not.toContain("SET assigned_operator_id =");
  });

  it("inherits the lead team so teamless imports wait for the administrator", () => {
    expect(migration).toContain("NEW.team_id");
    expect(migration).toContain("NEW.workspace_id");
    expect(migration).toContain("NEW.id");
  });

  it("queues an already closed lead as closed, like the original backfill", () => {
    expect(migration).toContain("WHEN NEW.status IN ('customer', 'unresponsive') THEN 'closed'");
    expect(migration).toContain("ELSE 'available'");
    expect(migration).toContain("CASE WHEN queue_state = 'closed' THEN NOW() ELSE NULL END");
  });

  it("fills the leads that the original backfill missed", () => {
    expect(migration).toContain("FROM public.leads AS lead");
    expect(migration).toContain("WHERE lead.workspace_id IS NOT NULL");
    expect(migration).toContain("lead.team_id");
  });

  it("does not expose the trigger function as a client entry point", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION private.enqueue_lead_queue_item()");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
  });

  it("lets the fixtures replace the automatic item with their intended state", () => {
    for (const { file, sql } of fixtures) {
      expect(sql, `${file} should upsert the queue item`).toContain(
        "on conflict (workspace_id, lead_id) do update set"
      );
      expect(sql, `${file} should overwrite the team`).toContain("team_id = excluded.team_id");
      expect(sql, `${file} should overwrite the state`).toContain("state = excluded.state");
    }
  });

  it("documents the behaviour in its own database test", () => {
    expect(exists("supabase", "tests", "database", "lead_queue_enqueue_test.sql")).toBe(true);

    const pgtap = read("supabase", "tests", "database", "lead_queue_enqueue_test.sql");
    expect(pgtap).toContain("select plan(20)");
    expect(pgtap).toContain("leads_enqueue_queue_item");
    expect(pgtap).toContain("the queue item inherits the lead team");
    expect(pgtap).toContain("confirming the team reaches the automatically created queue item");
  });
});
