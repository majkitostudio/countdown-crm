/**
 * Typy (důvody) neúspěchu a jejich rozdělení na ovlivnitelné a neovlivnitelné
 * operátorem.
 *
 * Rozdělení není kosmetické: ovlivnitelné typy se zkoušejí znovu (recyklace do
 * P4) a operátor u nich musí napsat, co se stalo. Neovlivnitelné typy lead
 * uzavírají a poznámku nevyžadují. Stejné rozdělení používají přehledy pro
 * vedoucího.
 *
 * Kódy zůstávají stabilní (`unsuccessful_sale`, `no_interest`, …) — mění se jen
 * popisky v UI. Staré hodnoty (`price`, `distrust`, `needs_time`,
 * `alternative_solution`) se v konzoli už nenabízejí, ale zůstávají platné kvůli
 * historii.
 */

export type FailReasonGroup = "influenceable" | "not_influenceable";

export const FAIL_REASON_OPTIONS = [
  { value: "unsuccessful_sale", label: "Neuzavřený obchod", group: "influenceable" },
  { value: "other", label: "Jiný důvod (vlastní popis)", group: "influenceable" },
  { value: "no_interest", label: "Bez zájmu (ukončeno)", group: "not_influenceable" },
  { value: "invalid_lead", label: "Invalidní přihláška (nesprávné údaje)", group: "not_influenceable" },
  { value: "health_concern", label: "Zdravotní důvody (alergie, intolerance)", group: "not_influenceable" },
  { value: "duplicate", label: "Duplikát", group: "not_influenceable" },
] as const;

const LEGACY_FAIL_REASONS = new Set([
  "price",
  "distrust",
  "alternative_solution",
  "needs_time",
  "other",
]);

/** Ovlivnitelné operátorem: zkoušejí se znovu a vyžadují poznámku. */
const INFLUENCEABLE_FAIL_REASONS: ReadonlySet<string> = new Set([
  "unsuccessful_sale",
  "other",
  "needs_time",
  "price",
  "distrust",
  "alternative_solution",
]);

/** Neovlivnitelné operátorem: lead se uzavírá, další pokus nemá smysl. */
const NOT_INFLUENCEABLE_FAIL_REASONS: ReadonlySet<string> = new Set([
  "no_interest",
  "invalid_lead",
  "health_concern",
  "duplicate",
]);

export const FAIL_REASON_GROUP_LABELS: Record<FailReasonGroup, string> = {
  influenceable: "Ovlivnitelné operátorem",
  not_influenceable: "Neovlivnitelné operátorem",
};

export type FailReason =
  | (typeof FAIL_REASON_OPTIONS)[number]["value"]
  | "price"
  | "distrust"
  | "alternative_solution"
  | "needs_time"
  | "other";

export interface FailDetails {
  failReason: FailReason;
  note: string;
}

export function isFailReason(value: unknown): value is FailReason {
  return typeof value === "string" && (
    FAIL_REASON_OPTIONS.some((option) => option.value === value) ||
    LEGACY_FAIL_REASONS.has(value)
  );
}

/** Skupina podle ovlivnitelnosti; `null` pro neznámý nebo nezaznamenaný typ. */
export function getFailReasonGroup(reason: string | null | undefined): FailReasonGroup | null {
  if (typeof reason !== "string") return null;
  if (INFLUENCEABLE_FAIL_REASONS.has(reason)) return "influenceable";
  if (NOT_INFLUENCEABLE_FAIL_REASONS.has(reason)) return "not_influenceable";
  return null;
}

export function getFailReasonLabel(reason: FailReason): string {
  const match = FAIL_REASON_OPTIONS.find((option) => option.value === reason);
  if (match) return match.label;
  return getFailReasonCzechLabel(reason);
}

export function isNoteRequiredForFailReason(reason: unknown): boolean {
  return typeof reason === "string" && INFLUENCEABLE_FAIL_REASONS.has(reason);
}

export function validateFailDetails(details: { failReason: unknown; note: string }): string | null {
  if (!isFailReason(details.failReason)) return "Select a fail reason.";
  if (isNoteRequiredForFailReason(details.failReason) && !details.note.trim()) {
    return "Add a short note for this fail.";
  }
  if (details.note.trim().length > 2_000) return "Fail note must contain at most 2,000 characters.";
  return null;
}

export function validateCallFailFields(details: { outcome: string; failReason: unknown; note: string }): string | null {
  if (details.note.trim().length > 2_000) return "Call note must contain at most 2,000 characters";
  if (details.outcome === "objection") return validateFailDetails(details);
  if (details.failReason !== null && details.failReason !== undefined) {
    return "Fail reason is only valid for a fail outcome";
  }
  return null;
}

export function isFailReasonRecyclable(reason: unknown): boolean {
  return typeof reason === "string" && INFLUENCEABLE_FAIL_REASONS.has(reason);
}

export function getFailReasonCooldownDays(reason: FailReason): number {
  if (isFailReasonRecyclable(reason)) {
    return 1;
  }
  return 1;
}

export function getFailReasonCzechLabel(reason: FailReason): string {
  switch (reason) {
    case "unsuccessful_sale":
      return "Neuzavřený obchod";
    case "no_interest":
      return "Bez zájmu";
    case "invalid_lead":
      return "Invalidní přihláška";
    case "health_concern":
      return "Zdravotní důvody";
    case "duplicate":
      return "Duplikát";
    case "needs_time":
      return "Rozmyšlená";
    case "price":
      return "Cena";
    case "distrust":
      return "Nedůvěra";
    case "alternative_solution":
      return "Konkurenční řešení";
    case "other":
      return "Jiný důvod";
    default:
      return reason;
  }
}
