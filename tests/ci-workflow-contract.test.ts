import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CI Workflow Contract", () => {
  const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");

  it("ensures GitHub Actions CI workflow exists and triggers on main branch", () => {
    expect(existsSync(workflowPath)).toBe(true);

    const workflowContent = readFileSync(workflowPath, "utf8");
    expect(workflowContent).toContain("branches: [main]");
    expect(workflowContent).toContain("pull_request");
    expect(workflowContent).toContain("push");
  });

  it("enforces lint, typecheck, test suite and production build execution", () => {
    const workflowContent = readFileSync(workflowPath, "utf8");

    expect(workflowContent).toContain("npm run lint");
    expect(workflowContent).toContain("npx tsc --noEmit");
    expect(workflowContent).toContain("npx vitest run");
    expect(workflowContent).toContain("npm run build");
  });

  it("uses the same pinned Supabase CLI as the project", () => {
    const workflowContent = readFileSync(workflowPath, "utf8");

    expect(workflowContent).toContain("uses: supabase/setup-cli@v3");
    expect(workflowContent).toContain("version: 3.1.0");
  });
});
