import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

describe("Milník 5.1: Čistá migrační zkouška (Clean DB Reset Contract)", () => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  it("má konzistentní pojmenování a chronologické řazení všech SQL migrací", () => {
    expect(files.length).toBeGreaterThanOrEqual(127);

    for (const file of files) {
      expect(file).toMatch(/^\d{12,14}_[a-zA-Z0-9_]+\.sql$/);
    }
  });

  it("všechny SQL migrace mají vyvážené dollar-quoting tagy ($$)", () => {
    for (const file of files) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
      const dollarQuotes = sql.match(/\$\$|\$[a-zA-Z0-9_]*\$/g) || [];
      expect(
        dollarQuotes.length % 2,
        `Nevyvážené tagy $$ v souboru ${file}`,
      ).toBe(0);
    }
  });

  it("sekvenční průchod všech 127 migrací vytvoří platné schéma bez neexistujících tabulek a sloupců v indexech", () => {
    const tables = new Map<string, Set<string>>();
    const functions = new Set<string>();

    function normalizeName(name: string): string {
      return name.trim().replace(/^public\./i, "").replace(/^"/, "").replace(/"$/, "").toLowerCase();
    }

    for (const file of files) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");

      // 1. CREATE TABLE
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
      let match: RegExpExecArray | null;
      while ((match = createTableRegex.exec(sql)) !== null) {
        const tableName = normalizeName(match[1]);
        const body = match[2];

        if (!tables.has(tableName)) {
          tables.set(tableName, new Set());
        }
        const cols = tables.get(tableName)!;

        const lines = body.split("\n");
        for (const rawLine of lines) {
          const line = rawLine.trim().replace(/,$/, "");
          if (!line || line.startsWith("--")) continue;
          if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|CHECK|UNIQUE)\b/i.test(line)) continue;
          const colMatch = line.match(/^"?([a-zA-Z0-9_]+)"?\s+([a-zA-Z0-9_]+)/);
          if (colMatch) {
            cols.add(colMatch[1].toLowerCase());
          }
        }
      }

      // 2. ALTER TABLE ... ADD COLUMN (i vícenásobné)
      const alterTableRegex = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+([\s\S]*?);/gi;
      while ((match = alterTableRegex.exec(sql)) !== null) {
        const tableName = normalizeName(match[1]);
        const body = match[2];

        expect(tables.has(tableName), `ALTER TABLE v ${file} odkazuje na neexistující tabulku '${tableName}'`).toBe(true);
        const cols = tables.get(tableName)!;

        const addColMatches = body.matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:")?([a-zA-Z0-9_]+)(?:")?\s+/gi);
        for (const m of addColMatches) {
          cols.add(m[1].toLowerCase());
        }
      }

      // 3. CREATE INDEX
      const createIndexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)(?:\s+USING\s+[a-zA-Z0-9_]+)?\s*\(([^)]+)\)/gi;
      while ((match = createIndexRegex.exec(sql)) !== null) {
        const tableName = normalizeName(match[1]);
        const columnsStr = match[2];

        expect(tables.has(tableName), `CREATE INDEX v ${file} odkazuje na neznámou tabulku '${tableName}'`).toBe(true);
        const knownCols = tables.get(tableName)!;

        const parts = columnsStr.split(",").map((p) => p.trim());
        for (const part of parts) {
          const simpleCol = part.match(/^"?([a-zA-Z0-9_]+)"?(?:\s+(?:ASC|DESC|NULLS\s+FIRST|NULLS\s+LAST))*$/i);
          if (simpleCol) {
            const colName = simpleCol[1].toLowerCase();
            expect(
              knownCols.has(colName),
              `CREATE INDEX v ${file} na tabulce '${tableName}' odkazuje na neexistující sloupec '${colName}'`,
            ).toBe(true);
          }
        }
      }

      // 4. CREATE FUNCTION
      const createFuncRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.|private\.)?([a-zA-Z0-9_]+)\s*\(/gi;
      while ((match = createFuncRegex.exec(sql)) !== null) {
        functions.add(match[1].toLowerCase());
      }
    }

    // Ověření klíčových produkčních tabulek
    expect(tables.has("workspaces")).toBe(true);
    expect(tables.has("workspace_members")).toBe(true);
    expect(tables.has("profiles")).toBe(true);
    expect(tables.has("leads")).toBe(true);
    expect(tables.has("orders")).toBe(true);
    expect(tables.has("order_items")).toBe(true);
    expect(tables.has("lead_queue_items")).toBe(true);
    expect(tables.has("wallet_transactions")).toBe(true);
    expect(tables.has("wallet_settings")).toBe(true);
    expect(tables.has("wallet_bonus_rules")).toBe(true);

    // Ověření opravených indexů z říjnového auditu (leads a lead_queue_items)
    const leadCols = tables.get("leads")!;
    expect(leadCols.has("workspace_id")).toBe(true);
    expect(leadCols.has("status")).toBe(true);
    expect(leadCols.has("assigned_to")).toBe(false); // potvrzení, že chybný sloupec assigned_to byl skutečně opraven

    const queueCols = tables.get("lead_queue_items")!;
    expect(queueCols.has("assigned_operator_id")).toBe(true);
    expect(queueCols.has("state")).toBe(true);
  });
});
