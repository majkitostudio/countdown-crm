import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/calls/page.tsx"), "utf8");

describe("manager review affordances in Call Logs", () => {
  it("offers a manager-only unreviewed filter and an icon-only neutral review action", () => {
    expect(source).toContain('selectedOutcomeFilter === "unreviewed"');
    expect(source).toContain("Unreviewed");
    expect(source).toContain("reviewHrefForCall(c)");
    expect(source).toContain('aria-label={`Open review for ${c.lead_name}`}');
    expect(source).toContain('title="Open review"');
    expect(source).toContain('<ClipboardCheck className="h-3.5 w-3.5 text-zinc-400"');
    expect(source).not.toContain("text-sky-300");
    expect(source).not.toContain("Needs review:");
    expect(source).toContain("return=unreviewed");
  });

  it("renders review status labels without exposing them to operators", () => {
    expect(source).toContain('const canReview = calls.some((call) => call.review_href !== null);');
    expect(source).toContain('review_status === "not_reviewed"');
    expect(source).toContain('if (status === "corrected") return "Corrected";');
    expect(source).toContain("canReview &&");
    expect(source).toContain("unreviewedCount");
    expect(source).toContain("All available calls are reviewed.");
  });

  it("keeps an unreviewed call neutral until a manager opens it", () => {
    expect(source).toContain('className="text-[11px] text-zinc-500"');
    expect(source).not.toContain('tone={c.review_status === "not_reviewed" ? "warning"');
  });
});
