import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  FAIL_REASON_OPTIONS,
  isFailReason,
  validateFailDetails,
} from "@/lib/postCall";
import { getCallOutcomeLabel } from "@/components/workspace/OperatorCallControls";

describe("post-call fail details", () => {
  it("exposes the approved fail reason taxonomy", () => {
    expect(FAIL_REASON_OPTIONS.map((option) => option.value)).toEqual([
      "unsuccessful_sale",
      "other",
      "no_interest",
      "invalid_lead",
      "health_concern",
      "duplicate",
    ]);
    expect(FAIL_REASON_OPTIONS.map((option) => option.label)).toEqual([
      "Neuzavřený obchod",
      "Jiný důvod (vlastní popis)",
      "Bez zájmu (ukončeno)",
      "Invalidní přihláška (nesprávné údaje)",
      "Zdravotní důvody (alergie, intolerance)",
      "Duplikát",
    ]);
  });

  it("accepts only known fail reasons", () => {
    expect(isFailReason("unsuccessful_sale")).toBe(true);
    expect(isFailReason("other")).toBe(true);
    expect(isFailReason("no_interest")).toBe(true);
    expect(isFailReason("invalid_lead")).toBe(true);
    expect(isFailReason("health_concern")).toBe(true);
    expect(isFailReason("duplicate")).toBe(true);
    expect(isFailReason("price")).toBe(true);
    expect(isFailReason("unknown")).toBe(false);
    expect(isFailReason(null)).toBe(false);
  });

  it("requires both a reason and a note for pitch objections, but allows optional note for cold refusals", () => {
    expect(validateFailDetails({ failReason: "", note: "" })).toBe("Select a fail reason.");
    expect(validateFailDetails({ failReason: "unsuccessful_sale", note: "  " })).toBe("Add a short note for this fail.");
    expect(validateFailDetails({ failReason: "unsuccessful_sale", note: "Klient nekoupil po kompletním představení." })).toBeNull();
    expect(validateFailDetails({ failReason: "other", note: "  " })).toBe("Add a short note for this fail.");
    expect(validateFailDetails({ failReason: "other", note: "Specifický důvod." })).toBeNull();
    expect(validateFailDetails({ failReason: "no_interest", note: "" })).toBeNull();
    expect(validateFailDetails({ failReason: "invalid_lead", note: "" })).toBeNull();
    expect(validateFailDetails({ failReason: "health_concern", note: "" })).toBeNull();
    expect(validateFailDetails({ failReason: "duplicate", note: "" })).toBeNull();
  });

  it("renames the negative outcome to Failed", () => {
    expect(getCallOutcomeLabel("fail")).toBe("Failed");
  });

  it("guarantees every UI fail reason is accepted by the latest DB constraint", () => {
    const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
    const migrationFiles = fs.readdirSync(migrationsDir).sort();
    let latestCheckConstraintMigration = "";
    for (const file of [...migrationFiles].reverse()) {
      const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      if (content.includes("calls_fail_reason_check")) {
        latestCheckConstraintMigration = content;
        break;
      }
    }
    expect(latestCheckConstraintMigration).toBeTruthy();
    for (const option of FAIL_REASON_OPTIONS) {
      expect(latestCheckConstraintMigration).toContain(`'${option.value}'`);
    }
  });
});
