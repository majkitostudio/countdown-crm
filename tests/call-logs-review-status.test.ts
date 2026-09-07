import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/calls/page.tsx"), "utf8");

describe("manager review affordances in Call Logs", () => {
  it("offers a manager-only unreviewed filter and exact row review link", () => {
    expect(source).toContain('selectedOutcomeFilter === "unreviewed"');
    expect(source).toContain("Unreviewed");
    expect(source).toContain('href={c.review_href}');
    expect(source).toContain("Open review");
  });

  it("renders review status labels without exposing them to operators", () => {
    expect(source).toContain('const canReview = calls.some((call) => call.review_href !== null);');
    expect(source).toContain('review_status === "not_reviewed"');
    expect(source).toContain('review_status === "corrected"');
    expect(source).toContain("canReview &&");
  });
});
