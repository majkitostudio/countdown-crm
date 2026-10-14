/**
 * Single source of truth for the workspace departments (P1–P4).
 *
 * A workspace is split into four departments. Each department groups the teams
 * that work the same kind of queue — for example, department P1 led by Team
 * Leader Jan Kačmář is team "P1K".
 *
 * This module holds only the department skeleton (identity and recognition).
 * It deliberately contains no products, lead sources, or routing intervals —
 * those live in the SQL routing functions and in the product catalogue.
 */

export type DepartmentKey = "P1" | "P2" | "P3" | "P4";

export interface DepartmentDefinition {
  key: DepartmentKey;
  /** Canonical, lowercase slug shared with teams and queue routing. */
  slug: string;
  /** English display name (rule: page and section names are English). */
  name: string;
  /** Short Czech description of the work this department handles. */
  purpose: string;
}

export const DEPARTMENTS: readonly DepartmentDefinition[] = [
  {
    key: "P1",
    slug: "p1",
    name: "Department P1",
    purpose: "Prioritní prodej — hot leads a doobjednávky z e-shopu.",
  },
  {
    key: "P2",
    slug: "p2",
    name: "Department P2",
    purpose: "Standardní prodej — masové volání napříč zdroji leadů.",
  },
  {
    key: "P3",
    slug: "p3",
    name: "Department P3",
    purpose: "Retence a péče — kontakt 21 dní po doručení balíčku.",
  },
  {
    key: "P4",
    slug: "p4",
    name: "Department P4",
    purpose: "Poslední záchrana — včerejší faily, vratky a balíčky na výdejně.",
  },
];

export const DEPARTMENT_KEYS: readonly DepartmentKey[] = DEPARTMENTS.map((department) => department.key);

const BY_KEY = new Map<DepartmentKey, DepartmentDefinition>(
  DEPARTMENTS.map((department) => [department.key, department]),
);
const BY_SLUG = new Map<string, DepartmentDefinition>(
  DEPARTMENTS.map((department) => [department.slug, department]),
);

/** Matches a department marker like "P1" in "p1", "Department P1" or team "P1K". */
const DEPARTMENT_MARKER = /\bp([1-4])(?![0-9])/i;

export function isDepartmentKey(value: unknown): value is DepartmentKey {
  return typeof value === "string" && BY_KEY.has(value as DepartmentKey);
}

export function getDepartment(key: DepartmentKey): DepartmentDefinition {
  const department = BY_KEY.get(key);
  if (!department) {
    throw new Error(`Unknown department key: ${key}`);
  }
  return department;
}

export function getDepartmentBySlug(slug: string | null | undefined): DepartmentDefinition | null {
  if (!slug) return null;
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function departmentKeyFromSlug(slug: string | null | undefined): DepartmentKey | null {
  return getDepartmentBySlug(slug)?.key ?? null;
}

/**
 * Recognises which department a team belongs to, from its canonical slug first
 * and then from its display name (handles default team names like "P1K" and any
 * legacy names such as "Department P4"). Returns null when nothing matches.
 */
export function departmentKeyFromTeam(
  team: { slug?: string | null; name?: string | null },
): DepartmentKey | null {
  const fromSlug = departmentKeyFromSlug(team.slug);
  if (fromSlug) return fromSlug;

  const match = team.name?.match(DEPARTMENT_MARKER);
  if (match) return `P${match[1]}`.toUpperCase() as DepartmentKey;

  return null;
}

/**
 * Default team name for a department: department marker plus the Team Leader's
 * surname initial, e.g. department P1 led by Jan Kačmář becomes "P1K".
 * Departments and teams will be renameable later; this is only the suggested
 * default.
 */
export function buildTeamName(department: DepartmentKey, leaderName: string): string {
  const parts = leaderName.trim().split(/\s+/);
  const surname = parts[parts.length - 1] ?? "";
  const initial = surname
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .charAt(0)
    .toUpperCase();

  return `${department}${initial}`;
}
