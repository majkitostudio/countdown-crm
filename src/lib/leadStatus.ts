import type { Database } from "@/lib/supabase/types";

export type LeadStatus = Database["public"]["Tables"]["leads"]["Row"]["status"];

/** Order used by every status picker and status legend in the app. */
export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "customer",
  "unresponsive",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nový",
  contacted: "Kontaktovaný",
  qualified: "Kvalifikovaný",
  customer: "Zákazník",
  unresponsive: "Nereaguje",
};

/** Labels stay neutral for unknown values so a new database status is never hidden. */
export function getLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}
