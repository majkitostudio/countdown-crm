import type { Database } from "@/lib/supabase/types";

export type PersistedCallOutcome = Database["public"]["Tables"]["calls"]["Row"]["outcome"];

/**
 * Outcome labels are presentation-only data. They live here so client
 * components can format a call outcome without importing the server call
 * module, which pulls in server actions.
 */
export function formatCallOutcome(outcome: PersistedCallOutcome): string {
  switch (outcome) {
    case "order_placed":
      return "Objednávka vytvořena";
    case "followup_scheduled":
      return "Hovor naplánován";
    case "objection":
      return "Neúspěšný";
    case "no_answer":
      return "Bez odpovědi";
    case "completed":
      return "Dokončeno";
    default:
      return "Neznámý výsledek";
  }
}
