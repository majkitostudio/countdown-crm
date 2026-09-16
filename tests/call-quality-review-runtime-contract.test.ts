import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const calls = readFileSync("src/lib/dal/calls.ts", "utf8");
const qualityDal = readFileSync("src/lib/dal/callQualityReviews.ts", "utf8");
const gemini = readFileSync("src/lib/ai/geminiCallQuality.ts", "utf8");
const panel = readFileSync("src/components/team/TeamQualityReviewPanel.tsx", "utf8");

describe("call quality review runtime contract", () => {
  it("queues direct call creation as well as post-call completion", () => {
    expect(calls).toContain("reviewCompletedCallForWorkspace(data.id, context.workspaceId)");
    expect(qualityDal).toContain('status: "pending"');
    expect(qualityDal).toContain("after(() => processCallQualityReviewForWorkspace");
  });

  it("uses the database claim lease before calling Gemini", () => {
    expect(qualityDal).toContain('rpc("claim_call_quality_review"');
    expect(qualityDal).toContain('.eq("claim_token", claimToken)');
    expect(qualityDal).toContain("claim_expires_at: null");
  });

  it("passes an abort signal to the Gemini request", () => {
    expect(gemini).toContain("const controller = new AbortController()");
    expect(gemini).toContain("abortSignal,");
  });

  it("offers a concrete Fail reason filter", () => {
    expect(panel).toContain('id="quality-fail-reason-filter"');
    expect(panel).toContain("FAIL_REASON_OPTIONS.map");
    expect(panel).toContain("review.call.failReason !== failReason");
  });
});
