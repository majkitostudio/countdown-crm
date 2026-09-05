import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260904104023_post_call_fail_details.sql"),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");
const completionDal = readFileSync(resolve(process.cwd(), "src/lib/dal/callCompletion.ts"), "utf8");
const workspacePage = readFileSync(resolve(process.cwd(), "src/app/workspace/page.tsx"), "utf8");
const summaryCard = readFileSync(resolve(process.cwd(), "src/components/workspace/PostCallSummaryCard.tsx"), "utf8");
const idempotencyMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905163258_harden_post_call_completion_idempotency.sql"),
  "utf8",
);

describe("post-call fail persistence contract", () => {
  it("stores fail reason and operator note as separate call fields", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS fail_reason TEXT");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS operator_note TEXT");
    expect(normalizedMigration).toContain("CHECK ( fail_reason IS NULL OR fail_reason IN (");
  });

  it("exposes a completion RPC that accepts the new fields", () => {
    expect(migration).toContain("call_note TEXT");
    expect(migration).toContain("call_fail_reason TEXT");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("queue_item.state = 'awaiting_outcome'");
    expect(normalizedMigration).toContain("operator_note = NULLIF(btrim(call_note), '')");
    expect(migration).toContain("fail_reason = call_fail_reason");
  });

  it("rejects a fail without both required details in SQL", () => {
    expect(migration).toContain("Fail outcomes require a fail reason");
    expect(migration).toContain("Fail outcomes require an operator note");
  });

  it("keeps completion retries on one stable request identity", () => {
    expect(completionDal).toContain("call_session_id: string");
    expect(completionDal).toContain("complete_call_with_order_items_idempotent");
    expect(completionDal).toContain("completion_key: input.call_session_id");
    expect(workspacePage).toContain("call_session_id: callSessionId");
    expect(workspacePage).toContain("callSessionId = softphoneSession.id");
    expect(workspacePage).not.toContain("activeQueueItemId || activeLead.id");
  });

  it("exposes an explicit saving, saved, failed and retry UI contract", () => {
    expect(summaryCard).toContain('data-testid="post-call-save-state"');
    expect(summaryCard).toContain('"saving" | "saved" | "failed"');
    expect(summaryCard).toContain("Retry");
  });

  it("uses a durable server-side request ledger for both completion boundaries", () => {
    expect(idempotencyMigration).toContain("CREATE TABLE IF NOT EXISTS public.call_completion_requests");
    expect(idempotencyMigration).toContain("CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items_idempotent");
    expect(idempotencyMigration).toContain("CREATE OR REPLACE FUNCTION public.complete_call_with_order_items_idempotent");
    expect(idempotencyMigration).toContain("ON CONFLICT (workspace_id, completion_key) DO NOTHING");
    expect(idempotencyMigration).toContain("operator_note = NULLIF(btrim(call_note), '')");
    expect(idempotencyMigration).toContain("fail_reason = call_fail_reason");
    expect(idempotencyMigration).toContain("callback_scheduled_at', callback_scheduled_at");
  });
});
