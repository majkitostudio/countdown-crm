import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

console.log("Analyzing all migrations in:", MIGRATIONS_DIR);

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} SQL migration files.`);

const tables = new Map(); // table_name -> Set<column_name>
const functions = new Set(); // func_signature
const errors = [];
const warnings = [];

function normalizeName(name) {
  if (!name) return "";
  let clean = name.trim().replace(/^public\./i, "").replace(/^"/, "").replace(/"$/, "").toLowerCase();
  return clean;
}

for (const file of files) {
  const filePath = resolve(MIGRATIONS_DIR, file);
  const sql = readFileSync(filePath, "utf8");

  // Check balanced dollar quotes
  const dollarQuotes = sql.match(/\$\$|\$[a-zA-Z0-9_]*\$/g) || [];
  if (dollarQuotes.length % 2 !== 0) {
    errors.push({ file, message: `Unbalanced dollar quoting (${dollarQuotes.length} tags found).` });
  }

  // 1. CREATE TABLE
  // Match: CREATE TABLE [IF NOT EXISTS] [public.]table_name ( ... );
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = normalizeName(match[1]);
    const body = match[2];

    if (!tables.has(tableName)) {
      tables.set(tableName, new Set());
    }
    const cols = tables.get(tableName);

    // Extract columns from body
    // Lines that start with a column name (not CONSTRAINT, PRIMARY KEY, CHECK, UNIQUE, FOREIGN KEY)
    const lines = body.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/,$/, "");
      if (!line || line.startsWith("--")) continue;
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|CHECK|UNIQUE)\b/i.test(line)) continue;
      const colMatch = line.match(/^"?([a-zA-Z0-9_]+)"?\s+([a-zA-Z0-9_]+)/);
      if (colMatch) {
        const colName = colMatch[1].toLowerCase();
        cols.add(colName);
      }
    }
  }

  // 2. ALTER TABLE ... (supports multiple ADD COLUMN clauses)
  const alterTableRegex = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+([\s\S]*?);/gi;
  while ((match = alterTableRegex.exec(sql)) !== null) {
    const tableName = normalizeName(match[1]);
    const body = match[2];

    if (!tables.has(tableName)) {
      errors.push({ file, message: `ALTER TABLE on non-existent table '${tableName}'.` });
      continue;
    }
    const cols = tables.get(tableName);

    // Find all ADD COLUMN [IF NOT EXISTS] colName
    const addColMatches = body.matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:")?([a-zA-Z0-9_]+)(?:")?\s+/gi);
    for (const m of addColMatches) {
      cols.add(m[1].toLowerCase());
    }
  }

  // 3. CREATE INDEX
  // Match: CREATE [UNIQUE] INDEX [IF NOT EXISTS] index_name ON [public.]table_name [USING ...] (col1, col2...)
  const createIndexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)(?:\s+USING\s+[a-zA-Z0-9_]+)?\s*\(([^)]+)\)/gi;
  while ((match = createIndexRegex.exec(sql)) !== null) {
    const tableName = normalizeName(match[1]);
    const columnsStr = match[2];

    if (!tables.has(tableName)) {
      errors.push({ file, message: `CREATE INDEX on unknown table '${tableName}'.` });
    } else {
      const knownCols = tables.get(tableName);
      // parse indexed columns / expressions
      const parts = columnsStr.split(",").map((p) => p.trim());
      for (const part of parts) {
        // Simple column or expression
        const simpleCol = part.match(/^"?([a-zA-Z0-9_]+)"?(?:\s+(?:ASC|DESC|NULLS\s+FIRST|NULLS\s+LAST))*$/i);
        if (simpleCol) {
          const colName = simpleCol[1].toLowerCase();
          if (!knownCols.has(colName)) {
            errors.push({
              file,
              message: `CREATE INDEX on table '${tableName}' references non-existent column '${colName}'.`,
            });
          }
        }
      }
    }
  }

  // 4. CREATE FUNCTION
  const createFuncRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.|private\.)?([a-zA-Z0-9_]+)\s*\(/gi;
  while ((match = createFuncRegex.exec(sql)) !== null) {
    functions.add(match[1].toLowerCase());
  }
}

console.log("\n--- Verification Summary ---");
console.log(`Total Tables defined: ${tables.size}`);
console.log(`Total Functions created: ${functions.size}`);
console.log(`Errors found: ${errors.length}`);
console.log(`Warnings found: ${warnings.length}`);

if (errors.length > 0) {
  console.error("\nERRORS DETECTED:");
  for (const err of errors) {
    console.error(`- [${err.file}]: ${err.message}`);
  }
  process.exit(1);
} else {
  console.log(`\nALL ${files.length} MIGRATIONS PASSED STRUCTURAL INTEGRITY CHECK! No invalid tables or missing columns in indexes.`);
}
