export const FAIL_REASON_OPTIONS = [
  { value: "price", label: "Price" },
  { value: "distrust", label: "Trust or doubts" },
  { value: "alternative_solution", label: "Already uses another solution" },
  { value: "health_concern", label: "Health concern or not suitable" },
  { value: "no_interest", label: "No interest" },
  { value: "needs_time", label: "Wants to think" },
  { value: "other", label: "Other reason" },
] as const;

export type FailReason = (typeof FAIL_REASON_OPTIONS)[number]["value"];

export interface FailDetails {
  failReason: FailReason;
  note: string;
}

export function isFailReason(value: unknown): value is FailReason {
  return typeof value === "string" && FAIL_REASON_OPTIONS.some((option) => option.value === value);
}

export function getFailReasonLabel(reason: FailReason): string {
  return FAIL_REASON_OPTIONS.find((option) => option.value === reason)?.label || reason;
}

const NOTE_REQUIRED_FAIL_REASONS: ReadonlySet<FailReason> = new Set([
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
      return 14;
  }
}

export function getFailReasonCzechLabel(reason: FailReason): string {
  switch (reason) {
    case "needs_time":
      return "Rozmyšlená";
    case "price":
      return "Cena";
    case "distrust":
      return "Nedůvěra";
    case "alternative_solution":
      return "Konkurenční řešení";
    case "health_concern":
      return "Zdravotní důvody";
    case "no_interest":
      return "Nezájem";
    case "other":
      return "Jiný důvod";
    default:
      return reason;
  }
}
