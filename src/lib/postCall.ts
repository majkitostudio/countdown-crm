export const FAIL_REASON_OPTIONS = [
  { value: "no_interest", label: "Bez zájmu (ukončeno)" },
  { value: "unsuccessful_sale", label: "Neúspěch (ukončeno bez finalizace)" },
  { value: "invalid_lead", label: "Invalidní přihláška (nesprávné údaje)" },
  { value: "health_concern", label: "Zdravotní důvody (alergie, intolerance)" },
] as const;

const LEGACY_FAIL_REASONS = new Set([
  "price",
  "distrust",
  "alternative_solution",
  "needs_time",
  "other",
]);

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

export function getFailReasonLabel(reason: FailReason): string {
  const match = FAIL_REASON_OPTIONS.find((option) => option.value === reason);
  if (match) return match.label;
  return getFailReasonCzechLabel(reason);
}

const NOTE_REQUIRED_FAIL_REASONS: ReadonlySet<FailReason> = new Set([
  "unsuccessful_sale",
  "price",
  "distrust",
  "other",
]);

export function isNoteRequiredForFailReason(reason: unknown): boolean {
  return typeof reason === "string" && NOTE_REQUIRED_FAIL_REASONS.has(reason as FailReason);
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

const RECYCLABLE_FAIL_REASONS: ReadonlySet<FailReason> = new Set([
  "unsuccessful_sale",
  "needs_time",
  "price",
  "distrust",
  "alternative_solution",
  "other",
]);

export function isFailReasonRecyclable(reason: unknown): boolean {
  return typeof reason === "string" && RECYCLABLE_FAIL_REASONS.has(reason as FailReason);
}

export function getFailReasonCooldownDays(reason: FailReason): number {
  switch (reason) {
    case "unsuccessful_sale":
      return 1;
    case "needs_time":
      return 3;
    case "price":
    case "other":
      return 14;
    case "distrust":
      return 21;
    case "alternative_solution":
      return 30;
    default:
      return 1;
  }
}

export function getFailReasonCzechLabel(reason: FailReason): string {
  switch (reason) {
    case "unsuccessful_sale":
      return "Neúspěšný prodej";
    case "no_interest":
      return "Bez zájmu";
    case "invalid_lead":
      return "Invalidní přihláška";
    case "health_concern":
      return "Zdravotní důvody";
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
