import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { findParityGaps, migrationVersionOf } from "../scripts/migrations-lib.mjs";
import { parseMigrationList, runParity } from "../scripts/verify-migration-parity.mjs";

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

describe("Supabase CLI migration parity", () => {
  const rows = localVersions.map((version) => ({ local: version, remote: version, time: version }));
  const output = (migrations: unknown) => JSON.stringify({ migrations, message: "Migrations listed" });

  it("čte verze z databázového sloupce včetně rozdílů na obou stranách", () => {
    expect(parseMigrationList(output([
      { local: "123", remote: "123", time: "123" },
      { local: "124", remote: "", time: "124" },
      { local: "", remote: "125", time: "125" },
    ]))).toEqual(["123", "125"]);
  });

  it.each(["", "not json", "{}", '{"migrations":null}', '{"migrations":[{}]}',
    '{"migrations":[{"local":"123","remote":null}]}',
    '{"migrations":[{"local":"","remote":""}]}',
    '{"migrations":[{"local":"123","remote":"wrong"}]}'])(
    "odmítne neplatný výstup %s", (value) => {
      expect(() => parseMigrationList(value)).toThrow();
    },
  );

  it.each([["local", [], "--local"], ["linked", ["--linked"], "--linked"]])(
    "spustí výslovně %s s JSON výstupem", (_label, args, flag) => {
      const run = vi.fn().mockReturnValue({ status: 0, stdout: output(rows), stderr: "" });
      expect(runParity(args, run)).toBe(0);
      expect(run.mock.calls[0][1].slice(1)).toEqual([
        "migration", "list", flag, "--output-format", "json",
      ]);
      expect(run.mock.calls[0][2]).not.toHaveProperty("shell");
    },
  );

  it("hlásí rozdíl a chyby CLI či neplatný výstup jako neúspěch", () => {
    expect(runParity([], vi.fn().mockReturnValue({ status: 0, stdout: output(rows.slice(1)) }))).toBe(1);
    expect(runParity([], vi.fn().mockReturnValue({ status: 1, stderr: "failed" }))).toBe(2);
    expect(runParity([], vi.fn().mockReturnValue({ status: 0, stdout: "{}" }))).toBe(2);
  });

  it("neznámý argument odmítne před spuštěním CLI", () => {
    const run = vi.fn();
    expect(runParity(["--remote"], run)).toBe(2);
    expect(run).not.toHaveBeenCalled();
  });
});
