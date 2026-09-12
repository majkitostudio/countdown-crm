export function getCallOutcomeClassName(outcome: string): string {
  switch (outcome) {
    case "order_placed":
    case "completed":
      return "border-emerald-800/60 bg-emerald-950/20 text-emerald-200";
    case "followup_scheduled":
      return "border-zinc-800 bg-zinc-900 text-zinc-300";
    case "no_answer":
      return "border-zinc-800 bg-zinc-900 text-zinc-300";
    case "objection":
      return "border-rose-900/60 bg-rose-950/20 text-rose-200";
    default:
      return "border-zinc-800 bg-zinc-900 text-zinc-300";
  }
}
