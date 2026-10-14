import { describe, expect, it } from "vitest";
import {
  buildTeamName,
  departmentKeyFromSlug,
  departmentKeyFromTeam,
  DEPARTMENT_KEYS,
  DEPARTMENTS,
  getDepartment,
  getDepartmentBySlug,
  isDepartmentKey,
} from "@/lib/department";

describe("department model (P1–P4)", () => {
  it("exposes exactly the four departments with canonical slugs", () => {
    expect(DEPARTMENT_KEYS).toEqual(["P1", "P2", "P3", "P4"]);
    expect(DEPARTMENTS.map((department) => department.slug)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("labels departments in English with a Czech purpose", () => {
    for (const department of DEPARTMENTS) {
      expect(department.name).toBe(`Department ${department.key}`);
      expect(department.purpose.length).toBeGreaterThan(0);
    }
  });

  it("validates and looks up department keys", () => {
    expect(isDepartmentKey("P1")).toBe(true);
    expect(isDepartmentKey("P5")).toBe(false);
    expect(isDepartmentKey(null)).toBe(false);
    expect(getDepartment("P3").slug).toBe("p3");
    expect(getDepartmentBySlug("P4")?.key).toBe("P4");
    expect(getDepartmentBySlug("unknown")).toBeNull();
  });

  it("recognises departments from slugs", () => {
    expect(departmentKeyFromSlug("p1")).toBe("P1");
    expect(departmentKeyFromSlug(" P4 ")).toBe("P4");
    expect(departmentKeyFromSlug("fronta-p2")).toBeNull();
  });

  it("recognises a department from a team slug or name", () => {
    expect(departmentKeyFromTeam({ slug: "p3", name: "Department P3" })).toBe("P3");
    expect(departmentKeyFromTeam({ slug: "oddeleni-p4", name: "Oddělení P4 (Retargeting)" })).toBe("P4");
    expect(departmentKeyFromTeam({ slug: null, name: "P1K" })).toBe("P1");
    expect(departmentKeyFromTeam({ name: "Department P2" })).toBe("P2");
  });

  it("does not mistake unrelated names for a department", () => {
    expect(departmentKeyFromTeam({ name: "Ranní směna" })).toBeNull();
    expect(departmentKeyFromTeam({ name: "Team Sleep10" })).toBeNull();
    expect(departmentKeyFromTeam({})).toBeNull();
  });

  it("builds the default team name from the department and leader surname initial", () => {
    expect(buildTeamName("P1", "Jan Kačmář")).toBe("P1K");
    expect(buildTeamName("P4", "Ábel Novák")).toBe("P4N");
    expect(buildTeamName("P2", "  ")).toBe("P2");
  });
});
