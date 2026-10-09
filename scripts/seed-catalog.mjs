import fs from "node:fs";
import path from "node:path";

const TEMPLATE_PATH = path.resolve(process.cwd(), "data/seeds/catalog-seed-template.json");
const OUTPUT_SQL_PATH = path.resolve(process.cwd(), "supabase/seed.sql");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TAGS = "p|br|strong|b|em|i|mark|ul|ol|li|hr";

export function escapeHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeSqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function escapeSqlArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "'{}'::text[]";
  const escaped = arr.map((item) => `"${String(item).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`);
  return `ARRAY[${arr.map((item) => escapeSqlString(item)).join(", ")}]::text[]`;
}

export function buildScriptHtml(script) {
  const parts = [];
  
  if (script.opening) {
    parts.push(`<p><strong>1. První pozitivní dojem:</strong></p>`);
    parts.push(`<p>${escapeHtml(script.opening)}</p>`);
  }
  
  if (Array.isArray(script.discoveryQuestions) && script.discoveryQuestions.length > 0) {
    parts.push(`<p><strong>2. Zjištění potřeb:</strong></p>`);
    for (const q of script.discoveryQuestions) {
      parts.push(`<p>${escapeHtml(q)}</p>`);
    }
  }
  
  if (Array.isArray(script.approvedBenefits) && script.approvedBenefits.length > 0) {
    parts.push(`<p><strong>3. Představení řešení a schválené benefity:</strong></p>`);
    for (const b of script.approvedBenefits) {
      parts.push(`<p>${escapeHtml(b)}</p>`);
    }
  }

  if (script.pricingOffer) {
    parts.push(`<p><strong>4. Cenová nabídka &amp; balíčky:</strong></p>`);
    parts.push(`<p>${escapeHtml(script.pricingOffer)}</p>`);
  }

  if (script.closing) {
    parts.push(`<p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p>`);
    parts.push(`<p>${escapeHtml(script.closing)}</p>`);
  }

  if (Array.isArray(script.guardrails) && script.guardrails.length > 0) {
    parts.push(`<p><strong>Pravidla a mantinely (Guardrails):</strong></p>`);
    for (const g of script.guardrails) {
      parts.push(`<p><strong>Script guidance:</strong> ${escapeHtml(g)}</p>`);
    }
  }

  const html = parts.join("");

  // Validate allowed markup
  const remaining = html.replace(new RegExp(`</?\\s*(${ALLOWED_TAGS})\\s*/?>`, "gi"), "");
  if (/<[^>]*>/.test(remaining)) {
    throw new Error(`Generated script HTML contains unauthorized tags: ${remaining}`);
  }

  if (html.length > 100000) {
    throw new Error(`Generated script HTML exceeds maximum 100,000 characters: ${html.length}`);
  }

  return html;
}

export function validateAndCompileCatalog(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Catalog seed data must be an object.");
  }

  const workspaceId = data.workspaceId || "00000000-0000-0000-0000-000000000001";
  if (!UUID_REGEX.test(workspaceId)) {
    throw new Error(`Invalid workspaceId: ${workspaceId}. Must be a valid UUID.`);
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    throw new Error("Catalog must contain at least one product in 'products' array.");
  }

  const compiledProducts = [];
  const compiledObjections = [];

  for (const [index, prod] of data.products.entries()) {
    if (!prod.id || !UUID_REGEX.test(prod.id)) {
      throw new Error(`Product at index ${index} must have a valid UUID 'id'.`);
    }
    if (!prod.title || typeof prod.title !== "string" || prod.title.trim().length === 0 || prod.title.length > 300) {
      throw new Error(`Product '${prod.id}' title must be between 1 and 300 characters.`);
    }
    if (!["supplements", "cosmetics", "electronics"].includes(prod.category)) {
      throw new Error(`Product '${prod.title}' category must be 'supplements', 'cosmetics', or 'electronics'.`);
    }
    if (typeof prod.price !== "number" || !Number.isFinite(prod.price) || prod.price < 0) {
      throw new Error(`Product '${prod.title}' price must be a non-negative finite number.`);
    }

    const scriptHtml = prod.script ? buildScriptHtml(prod.script) : "";

    const objections = [];
    if (Array.isArray(prod.objections)) {
      for (const [objIdx, obj] of prod.objections.entries()) {
        if (!obj.title || typeof obj.title !== "string" || obj.title.trim().length === 0 || obj.title.length > 500) {
          throw new Error(`Objection at index ${objIdx} for product '${prod.title}' must have title between 1 and 500 characters.`);
        }
        if (!Array.isArray(obj.rebuttals) || obj.rebuttals.length === 0) {
          throw new Error(`Objection '${obj.title}' must contain at least one rebuttal string.`);
        }
        for (const rebuttal of obj.rebuttals) {
          if (typeof rebuttal !== "string" || rebuttal.trim().length === 0 || rebuttal.length > 1000) {
            throw new Error(`Rebuttal in objection '${obj.title}' must be string <= 1000 characters.`);
          }
        }
        objections.push({
          title: obj.title.trim(),
          rebuttals: obj.rebuttals.map((r) => r.trim()),
        });
      }
    }

    compiledProducts.push({
      id: prod.id,
      workspaceId,
      title: prod.title.trim(),
      category: prod.category,
      price: prod.price,
      currency: (prod.currency || "CZK").trim(),
      description: prod.description ? prod.description.trim() : null,
      imageUrl: prod.image_url ? prod.image_url.trim() : null,
      inStock: prod.in_stock !== false,
      scriptHtml,
      objections,
    });

    compiledObjections.push(...objections.map((o) => ({ ...o, productId: prod.id, workspaceId })));
  }

  return { workspaceId, compiledProducts, compiledObjections };
}

export function generateSeedSql(compiled) {
  const { workspaceId, compiledProducts, compiledObjections } = compiled;
  const lines = [
    "-- ============================================================================",
    "-- COUNTDOWN CRM - AUTHENTICATED WORKSPACE CATALOG SEED",
    `-- Generated automatically from data/seeds/catalog-seed-template.json`,
    `-- Target Workspace: ${workspaceId}`,
    "-- ============================================================================",
    "",
    "DO $$",
    "DECLARE",
    "  v_org_id UUID;",
    `  v_ws_id UUID := '${workspaceId}'::UUID;`,
    "  v_admin_id UUID;",
    "BEGIN",
    "  -- 1. Ensure Organization exists",
    "  INSERT INTO public.organizations (name, slug)",
    "  VALUES ('Countdown Telemarketing', 'countdown')",
    "  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name",
    "  RETURNING id INTO v_org_id;",
    "",
    "  IF v_org_id IS NULL THEN",
    "    SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'countdown';",
    "  END IF;",
    "",
    "  -- 2. Ensure Target Workspace exists",
    "  INSERT INTO public.workspaces (id, organization_id, name, slug)",
    "  VALUES (v_ws_id, v_org_id, 'Hlavní linka CC', 'main')",
    "  ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name",
    "  RETURNING id INTO v_ws_id;",
    "",
    "  -- Catalog scripts require a real, already-authorized workspace administrator.",
    "  SELECT user_id INTO v_admin_id",
    "  FROM public.workspace_members",
    "  WHERE workspace_id = v_ws_id AND role = 'administrator'",
    "  ORDER BY created_at",
    "  LIMIT 1;",
    "",
    "  IF v_admin_id IS NULL THEN",
    "    RAISE EXCEPTION 'Catalog seed requires an existing workspace administrator created through Supabase Auth.';",
    "  END IF;",
    "",
  ];

  // Insert Products
  lines.push("  -- 6. Seed Catalog Products");
  for (const p of compiledProducts) {
    lines.push(`  INSERT INTO public.products (id, workspace_id, title, category, price, currency, description, image_url, in_stock)`);
    lines.push(`  VALUES (`);
    lines.push(`    '${p.id}'::UUID,`);
    lines.push(`    v_ws_id,`);
    lines.push(`    ${escapeSqlString(p.title)},`);
    lines.push(`    ${escapeSqlString(p.category)},`);
    lines.push(`    ${p.price},`);
    lines.push(`    ${escapeSqlString(p.currency)},`);
    lines.push(`    ${escapeSqlString(p.description)},`);
    lines.push(`    ${escapeSqlString(p.imageUrl)},`);
    lines.push(`    ${p.inStock}`);
    lines.push(`  )`);
    lines.push(`  ON CONFLICT (id) DO UPDATE SET`);
    lines.push(`    workspace_id = EXCLUDED.workspace_id,`);
    lines.push(`    title = EXCLUDED.title,`);
    lines.push(`    category = EXCLUDED.category,`);
    lines.push(`    price = EXCLUDED.price,`);
    lines.push(`    currency = EXCLUDED.currency,`);
    lines.push(`    description = EXCLUDED.description,`);
    lines.push(`    image_url = EXCLUDED.image_url,`);
    lines.push(`    in_stock = EXCLUDED.in_stock;`);
    lines.push("");
  }

  // Insert Scripts and Script Versions
  lines.push("  -- 7. Seed Product Scripts and Published Versions");
  for (const p of compiledProducts) {
    if (!p.scriptHtml) continue;

    lines.push(`  -- Script for: ${p.title}`);
    lines.push(`  INSERT INTO public.product_scripts (workspace_id, product_id, content_html, updated_by, updated_at)`);
    lines.push(`  VALUES (`);
    lines.push(`    v_ws_id,`);
    lines.push(`    '${p.id}'::UUID,`);
    lines.push(`    ${escapeSqlString(p.scriptHtml)},`);
    lines.push(`    v_admin_id,`);
    lines.push(`    now()`);
    lines.push(`  )`);
    lines.push(`  ON CONFLICT (workspace_id, product_id) DO UPDATE SET`);
    lines.push(`    content_html = EXCLUDED.content_html,`);
    lines.push(`    updated_by = EXCLUDED.updated_by,`);
    lines.push(`    updated_at = now();`);
    lines.push("");

    lines.push(`  INSERT INTO public.product_script_versions (workspace_id, product_id, version_number, status, content_html, created_by, published_by, created_at, published_at)`);
    lines.push(`  VALUES (`);
    lines.push(`    v_ws_id,`);
    lines.push(`    '${p.id}'::UUID,`);
    lines.push(`    1,`);
    lines.push(`    'published',`);
    lines.push(`    ${escapeSqlString(p.scriptHtml)},`);
    lines.push(`    v_admin_id,`);
    lines.push(`    v_admin_id,`);
    lines.push(`    now(),`);
    lines.push(`    now()`);
    lines.push(`  )`);
    lines.push(`  ON CONFLICT (workspace_id, product_id, version_number) DO UPDATE SET`);
    lines.push(`    status = 'published',`);
    lines.push(`    content_html = EXCLUDED.content_html,`);
    lines.push(`    published_by = EXCLUDED.published_by,`);
    lines.push(`    published_at = now();`);
    lines.push("");
  }

  // Clean old objections for seeded products to prevent duplication upon re-seed
  lines.push("  -- 8. Seed Objections Catalog");
  for (const p of compiledProducts) {
    lines.push(`  DELETE FROM public.objections WHERE workspace_id = v_ws_id AND product_id = '${p.id}'::UUID;`);
  }
  lines.push("");

  for (const o of compiledObjections) {
    lines.push(`  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)`);
    lines.push(`  VALUES (`);
    lines.push(`    v_ws_id,`);
    lines.push(`    '${o.productId}'::UUID,`);
    lines.push(`    ${escapeSqlString(o.title)},`);
    lines.push(`    ${escapeSqlArray(o.rebuttals)}`);
    lines.push(`  );`);
  }

  lines.push("END $$;");
  lines.push("");

  return lines.join("\n");
}

function run() {
  console.log(`Reading catalog template from: ${TEMPLATE_PATH}`);
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file does not exist at ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const data = JSON.parse(rawJson);

  console.log("Validating and compiling catalog seed data...");
  const compiled = validateAndCompileCatalog(data);

  console.log(`- Products validated: ${compiled.compiledProducts.length}`);
  console.log(`- Objections validated: ${compiled.compiledObjections.length}`);

  const sql = generateSeedSql(compiled);
  fs.writeFileSync(OUTPUT_SQL_PATH, sql, "utf8");
  console.log(`Successfully generated SQL seed: ${OUTPUT_SQL_PATH} (${sql.length} bytes)`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  run();
}
