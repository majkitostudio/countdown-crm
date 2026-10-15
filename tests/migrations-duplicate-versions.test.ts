import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findDuplicateVersions, migrationVersionOf } from "../scripts/migrations-lib.mjs";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

describe("Milník 5.2: kontrola duplicitních verzí migrací", () => {
  it("za verzi migrace považuje prefix před prvním podtržítkem", () => {
    expect(migrationVersionOf("20261014120000_team_leader_exception_pickup_risk.sql")).toBe(
      "20261014120000",
    );
    // Dvanáctimístný prefix je dnes také použitý (starší migrace) a musí se počítat stejně.
    expect(migrationVersionOf("202608150001_training_sessions.sql")).toBe("202608150001");
    expect(migrationVersionOf("no_underscore.sql")).toBe("no");
  });

  it("odhalí dvě migrace se stejnou verzí", () => {
    // Přesně tahle kolize už v projektu jednou vznikla (verze 20261007140000).
    const duplicates = findDuplicateVersions([
      "20261007140000_p4_queue_recycling.sql",
      "20261007140000_other_copy.sql",
      "20261007150000_recycling_rules_30m_24h.sql",
    ]);

    expect(duplicates).toEqual([
      {
        version: "20261007140000",
        files: ["20261007140000_other_copy.sql", "20261007140000_p4_queue_recycling.sql"],
      },
    ]);
  });

  it("různé verze nehlásí, ani když se liší jen délkou prefixu", () => {
    expect(
      findDuplicateVersions([
        "202608150001_training_sessions.sql",
        "202608150002_training_session_owner_cleanup.sql",
        "20260816180916_leads_company_field.sql",
      ]),
    ).toEqual([]);
  });

  it("skutečné migrace v repozitáři nemají duplicitní verzi", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    expect(files.length).toBeGreaterThan(0);
    expect(findDuplicateVersions(files)).toEqual([]);
  });
});
