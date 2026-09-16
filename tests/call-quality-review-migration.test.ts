import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260916100000_call_quality_reviews.sql", "utf8");
const asyncMigration = readFileSync("supabase/migrations/20260916110000_call_quality_review_async_claim.sql", "utf8");

describe("call quality review migration", () => {
  it("stores one server-owned recommendation per real call", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.call_quality_reviews");
    expect(migration).toContain("CONSTRAINT call_quality_reviews_call_unique UNIQUE (call_id)");
    expect(migration).toContain("status IN ('pending', 'ok', 'review', 'unavailable')");
    expect(migration).toContain("REFERENCES public.calls(id)");
  });

  it("keeps results readable only inside the reviewed call team scope", () => {
    expect(migration).toContain("ALTER TABLE public.call_quality_reviews ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("private.can_access_call_review(workspace_id, call_id)");
    expect(migration).toContain("REVOKE ALL ON TABLE public.call_quality_reviews FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT SELECT ON TABLE public.call_quality_reviews TO authenticated, service_role");
    expect(migration).not.toContain("GRANT INSERT ON TABLE public.call_quality_reviews TO authenticated");
  });

  it("documents that training sessions are outside this result table", () => {
    expect(migration).toContain("Training sessions are stored separately");
  });

  it("gives the server role the write access required by the queue", () => {
    expect(asyncMigration).toContain("GRANT SELECT, INSERT, UPDATE ON TABLE public.call_quality_reviews TO service_role");
    expect(asyncMigration).toContain("CREATE OR REPLACE FUNCTION public.claim_call_quality_review");
    expect(asyncMigration).toContain("review.claim_expires_at < NOW()");
    expect(asyncMigration).toContain("attempt_count = review.attempt_count + 1");
    expect(asyncMigration).toContain("REVOKE ALL ON FUNCTION public.claim_call_quality_review");
  });
});
