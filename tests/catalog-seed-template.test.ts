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
    expect(sql).toContain("INSERT INTO public.workspaces");
    expect(sql).toContain("INSERT INTO public.products");
    expect(sql).toContain("INSERT INTO public.product_scripts");
    expect(sql).toContain("INSERT INTO public.product_script_versions");
    expect(sql).toContain("INSERT INTO public.objections");

    // Idempotent upserts
    expect(sql).toContain("ON CONFLICT (id) DO UPDATE");
    expect(sql).toContain("ON CONFLICT (workspace_id, product_id) DO UPDATE");
    expect(sql).toContain("ON CONFLICT (workspace_id, product_id, version_number) DO UPDATE");
  });

  it("keeps the seed runnable on a disposable local database", () => {
    const raw = fs.readFileSync(templatePath, "utf8");
    const sql = generateSeedSql(validateAndCompileCatalog(JSON.parse(raw)));

    // The oldest migrations bootstrap a workspace with the same organization and
    // slug ('main'). Its slug must be freed, never the workspace deleted: the
    // audit triggers on its children reference the workspace being removed.
    expect(sql).toContain("INSERT INTO public.workspaces");
    expect(sql).toContain("WHERE organization_id = v_org_id AND slug = 'main' AND id <> v_ws_id;");
    expect(sql).not.toContain("DELETE FROM public.workspaces");

    // profiles.id references auth.users(id) and the script metadata references
    // profiles, so a real auth row must exist before the catalog is inserted.
    const authUsersIndex = sql.indexOf("INSERT INTO auth.users");
    const profileIndex = sql.indexOf("INSERT INTO public.profiles");
    expect(authUsersIndex).toBeGreaterThan(-1);
    expect(profileIndex).toBeGreaterThan(authUsersIndex);

    // products.category is plain text since the schema was rewritten; the old
    // ::public.product_category cast made a clean reset fail with 42704.
    expect(sql).not.toContain("::public.product_category");

    // Seed data must never be reusable outside a disposable database.
    expect(sql).toContain("LOCAL DEMO CATALOG SEED");
  });
});
