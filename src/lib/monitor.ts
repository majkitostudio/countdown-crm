export interface LiveOperatorState {
  id: string;
  agentName: string;
  role: string;
  status: "in_call" | "ready" | "break" | "wrap_up";
  customerName: string | null;
  productTarget: string | null;
  currentCallDuration: number; // in seconds
  detectedObjection: string | null;
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  callsCompletedToday: number;
  salesToday: number;
}

export const INITIAL_MOCK_OPERATORS: LiveOperatorState[] = [
  {
    id: "op-1",
    agentName: "Alex Vance",
    role: "Senior Sales Rep",
    status: "in_call",
    customerName: "Eleanor Vance",
    productTarget: "Bio-Boost Anti-Aging Stack",
    currentCallDuration: 215, // 3m 35s
    detectedObjection: "Price is too high compared to pharmacy vitamins",
    sentiment: "Price Objection",
    callsCompletedToday: 42,
    salesToday: 2450.00,
  },
  {
    id: "op-2",
    agentName: "Sarah Connor",
    role: "Sales Specialist",
    status: "in_call",
    customerName: "Marcus Holloway",
    productTarget: "Smart Body Composition Scale",
    currentCallDuration: 94, // 1m 34s
    detectedObjection: null,
    sentiment: "Positive",
    callsCompletedToday: 38,
    salesToday: 1890.00,
  },
  {
    id: "op-3",
    agentName: "David Miller",
    role: "Account Executive",
    status: "ready",
    customerName: null,
    productTarget: null,
    currentCallDuration: 0,
    detectedObjection: null,
    sentiment: "Neutral",
    callsCompletedToday: 45,
    salesToday: 1540.00,
  },
  {
    id: "op-4",
    agentName: "Elena Rostova",
    role: "Telemarketing Agent",
    status: "break",
    customerName: null,
    productTarget: null,
    currentCallDuration: 0,
    detectedObjection: null,
    sentiment: "Neutral",
    callsCompletedToday: 29,
    salesToday: 980.00,
  },
];

const liveOperatorsStore: LiveOperatorState[] = [...INITIAL_MOCK_OPERATORS];

/**
 * Retrieves real-time operator status for team monitor
 */
export async function getLiveOperators(): Promise<LiveOperatorState[]> {
  return liveOperatorsStore;
}
