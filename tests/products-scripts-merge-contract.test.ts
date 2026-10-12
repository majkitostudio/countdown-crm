import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Products & Scripts merge (A)", () => {
  it("keeps the product catalog and the script editor on one surface behind an admin tab", () => {
    const products = source("src/app/products/page.tsx");

    expect(products).toContain("ProductCatalogClient");
    expect(products).toContain("ProductScriptManager");
    expect(products).toContain('params?.tab === "scripts"');
    expect(products).toContain("isAdministrator");
    expect(products).toContain("loadProductScripts");
    expect(products).toContain('requireWorkspaceRole(["administrator"])');
    expect(products).toContain('href: "/products?tab=scripts"');
  });

  it("retires the standalone scripts page into a redirect to the Scripts tab", () => {
    const scripts = source("src/app/settings/scripts/page.tsx");

    expect(scripts).toContain('redirect("/products?tab=scripts")');
    expect(scripts).not.toContain("PageHeader");
  });

  it("points the Management card and the readiness check at the merged surface", () => {
    const admin = source("src/app/admin/page.tsx");
    const readiness = source("src/lib/dal/workspaceReadiness.ts");

    expect(admin).toContain('href: "/products?tab=scripts"');
    expect(readiness).not.toContain('"/settings/scripts"');
    expect(readiness).toContain('"/products?tab=scripts"');
  });
});
