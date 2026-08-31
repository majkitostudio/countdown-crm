import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("Customer 360 UI contract", () => {
  it("mounts a truthful retention snapshot on the lead detail route", () => {
    const page = readFileSync(path.join(projectRoot, "src", "app", "leads", "[leadId]", "page.tsx"), "utf8");
    const card = readFileSync(path.join(projectRoot, "src", "components", "leads", "Customer360RetentionCard.tsx"), "utf8");

    expect(page).toContain("<Customer360RetentionCard");
    expect(page).toContain("listWorkspaceLeadActivity");
    expect(card).toContain('data-testid="customer-360-retention"');
    expect(card).toContain("Persisted workspace data");
    expect(card).toContain("activityUnavailable");
  });
});
