import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateAndCompileCatalog, generateSeedSql, buildScriptHtml } from "../scripts/seed-catalog.mjs";
import { validateScriptHtml } from "@/lib/scriptContent";

describe("Catalog Seed Template Contract", () => {
  const templatePath = path.resolve(process.cwd(), "data/seeds/catalog-seed-template.json");
  const seedSqlPath = path.resolve(process.cwd(), "supabase/seed.sql");

  it("loads and validates catalog-seed-template.json successfully", () => {
    expect(fs.existsSync(templatePath)).toBe(true);
    const raw = fs.readFileSync(templatePath, "utf8");
    const data = JSON.parse(raw);

    const compiled = validateAndCompileCatalog(data);

    expect(compiled.compiledProducts.length).toBeGreaterThanOrEqual(3);
    expect(compiled.compiledObjections.length).toBeGreaterThanOrEqual(5);

    for (const product of compiled.compiledProducts) {
      expect(product.category).toBe("supplements");
      expect(product.price).toBeGreaterThan(0);
      expect(product.currency).toBe("CZK");
      expect(product.title.length).toBeGreaterThan(5);
      expect(product.scriptHtml).toBeTruthy();

      // Ensure the generated HTML passes application runtime validation
      const sanitized = validateScriptHtml(product.scriptHtml);
      expect(sanitized).toBe(product.scriptHtml);
    }
  });

  it("formats scripts with all required telemarketing sections", () => {
    const raw = fs.readFileSync(templatePath, "utf8");
    const data = JSON.parse(raw);
    const firstProduct = data.products[0];

    expect(firstProduct.script).toBeDefined();
    expect(firstProduct.script.opening).toBeTruthy();
    expect(firstProduct.script.discoveryQuestions.length).toBeGreaterThanOrEqual(2);
    expect(firstProduct.script.approvedBenefits.length).toBeGreaterThanOrEqual(2);
    expect(firstProduct.script.pricingOffer).toBeTruthy();
    expect(firstProduct.script.closing).toBeTruthy();
    expect(firstProduct.script.guardrails.length).toBeGreaterThanOrEqual(2);

    const html = buildScriptHtml(firstProduct.script);
    expect(html).toContain("1. První pozitivní dojem");
    expect(html).toContain("2. Zjištění potřeb");
    expect(html).toContain("3. Představení řešení a schválené benefity");
    expect(html).toContain("4. Cenová nabídka &amp; balíčky");
    expect(html).toContain("5. Závěrečný pozitivní dojem a potvrzení");
    expect(html).toContain("Pravidla a mantinely (Guardrails)");
    expect(html).toContain("Script guidance");
  });

  it("generates an idempotent seed.sql with balanced dollar quotes", () => {
    expect(fs.existsSync(seedSqlPath)).toBe(true);
    const sql = fs.readFileSync(seedSqlPath, "utf8");

    const raw = fs.readFileSync(templatePath, "utf8");
    const data = JSON.parse(raw);
    const compiled = validateAndCompileCatalog(data);
    const generatedSql = generateSeedSql(compiled);
    expect(generatedSql).toBe(sql);

    // Dollar quote balance
    const dollarCount = (sql.match(/\$\$/g) || []).length;
    expect(dollarCount % 2).toBe(0);

    // Contains required tables
    expect(sql).not.toContain("INSERT INTO auth.users");
    expect(sql).toContain("Catalog seed requires an existing workspace administrator created through Supabase Auth.");
    expect(sql).toContain("INSERT INTO public.workspaces");
    expect(sql).toContain("ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name");
    expect(sql).toContain("INSERT INTO public.products");
    expect(sql).not.toContain("::public.product_category");
    expect(sql).toContain("INSERT INTO public.product_scripts");
    expect(sql).toContain("INSERT INTO public.product_script_versions");
    expect(sql).toContain("INSERT INTO public.objections");

    // Idempotent upserts
    expect(sql).toContain("ON CONFLICT (id) DO UPDATE");
    expect(sql).toContain("ON CONFLICT (workspace_id, product_id) DO UPDATE");
    expect(sql).toContain("ON CONFLICT (workspace_id, product_id, version_number) DO UPDATE");
  });
});
