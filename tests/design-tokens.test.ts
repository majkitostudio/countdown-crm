import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("semantic design tokens", () => {
  it("defines the shared color, geometry, focus, and motion token groups", () => {
    for (const token of [
      "--color-canvas",
      "--color-surface-page",
      "--color-surface-inset",
      "--color-surface-overlay",
      "--color-border-default",
      "--color-text-primary",
      "--color-action-primary",
      "--color-status-info",
      "--color-status-blocked",
      "--radius-control",
      "--radius-surface",
      "--spacing-page-gutter",
      "--shadow-overlay",
      "--ease-interface",
    ]) {
      expect(globalStyles).toContain(token);
    }
  });
});
