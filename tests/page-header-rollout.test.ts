import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

function findPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findPageFiles(entryPath);
    return entry.name === "page.tsx" ? [entryPath] : [];
  });
}

describe("PageHeader route rollout", () => {
  it("keeps the shared PageHeader on every authenticated route", () => {
    const pageFiles = findPageFiles(path.join(projectRoot, "src", "app"));
    const authenticatedPages = pageFiles.filter((filePath) => !filePath.includes(`${path.sep}login${path.sep}`));

    expect(authenticatedPages.length).toBeGreaterThan(0);
    for (const filePath of authenticatedPages) {
      const source = readFileSync(filePath, "utf8");
      expect(source, path.relative(projectRoot, filePath)).toContain("PageHeader");
    }
  });

  it("keeps route-level heading ownership in PageHeader", () => {
    const pageHeaderSource = readFileSync(path.join(projectRoot, "src", "components", "layout", "PageHeader.tsx"), "utf8");
    expect(pageHeaderSource.match(/<h1\b/g)).toHaveLength(1);

    for (const relativePath of [
      "src/components/orders/OrderCreateForm.tsx",
      "src/components/orders/OrderEditForm.tsx",
      "src/components/settings/ProductScriptManager.tsx",
    ]) {
      expect(readFileSync(path.join(projectRoot, relativePath), "utf8"), relativePath).not.toMatch(/<h1\b/);
    }

    expect(readFileSync(path.join(projectRoot, "src", "components", "workspace", "OperatorLeadHeader.tsx"), "utf8")).toContain("<h2");
  });
});
