import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findParityGaps, migrationVersionOf } from "../scripts/migrations-lib.mjs";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

const localFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const localVersions = localFiles.map(migrationVersionOf);

describe("Milník 5.5: kontrola migration parity", () => {
  it("nehlásí rozdíl, když disk i databáze obsahují stejné verze", () => {
    expect(findParityGaps({ localVersions, appliedVersions: localVersions })).toEqual({
      missingInDatabase: [],
      missingOnDisk: [],
    });
  });

  it("odhalí migraci, která je v repozitáři, ale v databázi se nikdy nespustila", () => {
    const applied = localVersions.filter((version) => version !== "20261014120000");

    const gaps = findParityGaps({ localVersions, appliedVersions: applied });

    expect(gaps.missingInDatabase).toEqual(["20261014120000"]);
    expect(gaps.missingOnDisk).toEqual([]);
  });

  it("odhalí migraci, kterou databáze eviduje, ale soubor v repozitáři chybí", () => {
    const applied = [...localVersions, "20260101000000"];

    const gaps = findParityGaps({ localVersions, appliedVersions: applied });

    expect(gaps.missingInDatabase).toEqual([]);
    expect(gaps.missingOnDisk).toEqual(["20260101000000"]);
  });

  it("skutečný repozitář má neprázdný a unikátní seznam verzí", () => {
    expect(localVersions.length).toBeGreaterThan(0);
    expect(new Set(localVersions).size).toBe(localVersions.length);
  });
});
