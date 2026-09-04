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

export function validateFailDetails(details: { failReason: unknown; note: string }): string | null {
  if (!isFailReason(details.failReason)) return "Select a fail reason.";
  if (!details.note.trim()) return "Add a short note for this fail.";
  if (details.note.trim().length > 2_000) return "Fail note must contain at most 2,000 characters.";
  return null;
}
