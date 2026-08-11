export interface LiveOperatorState {
  id: string;
  agentName: string;
  role: string;
  status: "in_call" | "ready" | "break" | "wrap_up";
  customerName: string | null;
  productTarget: string | null;
  currentCallDuration: number;
  detectedObjection: string | null;
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  callsCompletedToday: number;
  salesToday: number;
}

/** Live presence is not persisted by the current pilot schema. */
export async function getLiveOperators(): Promise<LiveOperatorState[]> {
  return [];
}
