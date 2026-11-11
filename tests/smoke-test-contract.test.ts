import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const smokeTest = readFileSync(path.resolve(__dirname, "../scripts/playwright-smoke-test.mjs"), "utf8");

describe("Playwright smoke test failure contract", () => {
  it("fails routes on HTTP errors, browser console errors, or uncaught page errors", () => {
    expect(smokeTest).toContain("response.status() >= 400");
    expect(smokeTest).toContain("consoleErrors.length === 0");
    expect(smokeTest).toContain("httpErrors.length === 0");
    expect(smokeTest).toContain("pageErrors.length === 0");
    expect(smokeTest).toContain("visibleErrorState");
    expect(smokeTest).toContain("const errorHeading = mainHeadings.find");
    expect(smokeTest).toContain("could not be loaded");
  });

  it("returns a failing exit code when an interaction check fails", () => {
    expect(smokeTest).toContain("if (!passed) hasFailure = true");
    expect(smokeTest).toContain("if (hasFailure)");
    expect(smokeTest).toContain("process.exitCode = 1");
  });
});
