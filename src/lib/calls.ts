import { createClient } from "./supabase/client";

export interface TranscriptEntry {
  speaker: "agent" | "customer";
  text: string;
  timestamp: string;
}

export interface CallRecord {
  id: string;
  lead_id: string;
  lead_name: string;
  agent_name: string;
  duration_seconds: number;
  outcome: "order_placed" | "followup_scheduled" | "no_answer" | "objection_handled";
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  order_value: number;
  transcript: TranscriptEntry[];
  created_at: string;
}

export const INITIAL_MOCK_CALLS: CallRecord[] = [
  {
    id: "call-101",
    lead_id: "lead-1",
    lead_name: "Eleanor Vance",
    agent_name: "Alex Vance",
    duration_seconds: 342, // 5m 42s
    outcome: "order_placed",
    sentiment: "Positive",
    order_value: 125.00,
    transcript: [
      { speaker: "agent", text: "Dobrý den, tady Alex z Countdown CRM. Mluvím s paní Vance?", timestamp: "10:15:02" },
      { speaker: "customer", text: "Ano, dobrý den. Prohlížela jsem si váš Bio-Boost balíček, ale ta cena se mi zdá docela vysoká.", timestamp: "10:15:08" },
      { speaker: "agent", text: "Rozumím paní Vance. Náš Bio-Boost využívá lipozomální technologii s až 800% vyšší vstřebatelností než běžné vitamíny z lékárny.", timestamp: "10:15:22" },
      { speaker: "customer", text: "Aha, to zní zajímavě. Je k tomu nějaká sleva při zakoupení více balení?", timestamp: "10:15:45" },
      { speaker: "agent", text: "Určitě! Nabízím vám 3-měsíční výhodný balíček se slevou 15 % a s doručením zdarma.", timestamp: "10:16:05" },
      { speaker: "customer", text: "Skvělé, to beru!", timestamp: "10:16:15" },
    ],
    created_at: "2026-08-01T10:15:00Z",
  },
  {
    id: "call-102",
    lead_id: "lead-2",
    lead_name: "Marcus Holloway",
    agent_name: "Sarah Connor",
    duration_seconds: 185, // 3m 05s
    outcome: "followup_scheduled",
    sentiment: "Price Objection",
    order_value: 0,
    transcript: [
      { speaker: "agent", text: "Dobrý den pane Holloway, volám ohledně vaší poptávky po Smart Scale.", timestamp: "11:00:10" },
      { speaker: "customer", text: "Dobrý den. Jsem teď na schůzce, mohl byste zavolat zítra v 14:00?", timestamp: "11:00:25" },
      { speaker: "agent", text: "Samozřejmě, nastavuji si do kalendáře připomínku na zítra ve 14:00.", timestamp: "11:00:40" },
    ],
    created_at: "2026-08-01T11:00:00Z",
  },
  {
    id: "call-103",
    lead_id: "lead-3",
    lead_name: "Sophia Martinez",
    agent_name: "Alex Vance",
    duration_seconds: 410, // 6m 50s
    outcome: "order_placed",
    sentiment: "Positive",
    order_value: 168.50,
    transcript: [
      { speaker: "agent", text: "Dobrý den paní Martinez, navazuji na váš zájem o Cellular Hyaluron Serum.", timestamp: "11:30:00" },
      { speaker: "customer", text: "Dobrý den. Chtěla jsem se zeptat, zda je sérum vhodné pro citlivou pokožku.", timestamp: "11:30:15" },
      { speaker: "agent", text: "Ano, je 100% hypoalergenní a dermatologicky testované.", timestamp: "11:30:30" },
      { speaker: "customer", text: "Perfektní, přidám si i balíček doplňků stravy.", timestamp: "11:31:00" },
    ],
    created_at: "2026-08-01T11:30:00Z",
  },
  {
    id: "call-104",
    lead_id: "lead-4",
    lead_name: "Jan Novák",
    agent_name: "Sarah Connor",
    duration_seconds: 45,
    outcome: "no_answer",
    sentiment: "Neutral",
    order_value: 0,
    transcript: [
      { speaker: "agent", text: "Dobrý den, volám z Countdown CRM...", timestamp: "12:05:00" },
    ],
    created_at: "2026-08-01T12:05:00Z",
  }
];

const CALLS_STORAGE_KEY = "countdown_crm_calls_v1";

function loadLocalCalls(): CallRecord[] {
  if (typeof window === "undefined") return INITIAL_MOCK_CALLS;
  const stored = localStorage.getItem(CALLS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_CALLS));
    return INITIAL_MOCK_CALLS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_CALLS;
  }
}

function saveLocalCalls(calls: CallRecord[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calls));
  }
}

let localCallsStore: CallRecord[] = loadLocalCalls();

/**
 * Fetch all call records
 */
export async function getCalls(): Promise<CallRecord[]> {
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("calls") as any).select("*");
    if (error || !data || data.length === 0) {
      return localCallsStore;
    }
    return data as CallRecord[];
  } catch (err) {
    console.warn("Supabase fetch calls failed, using local store:", err);
    return localCallsStore;
  }
}

/**
 * Fetch single call by ID
 */
export async function getCallById(id: string): Promise<CallRecord | null> {
  const calls = await getCalls();
  return calls.find((c) => c.id === id) || null;
}

/**
 * Add a new call record to local store and Supabase
 */
export async function addCallRecord(newCallPayload: Partial<CallRecord>): Promise<CallRecord> {
  const newRecord: CallRecord = {
    id: newCallPayload.id || `call-${Date.now()}`,
    lead_id: newCallPayload.lead_id || "lead-1",
    lead_name: newCallPayload.lead_name || "Unknown Customer",
    agent_name: newCallPayload.agent_name || "Operator",
    duration_seconds: newCallPayload.duration_seconds || 120,
    outcome: newCallPayload.outcome || "followup_scheduled",
    sentiment: newCallPayload.sentiment || "Neutral",
    order_value: newCallPayload.order_value || 0,
    transcript: newCallPayload.transcript || [
      { speaker: "agent", text: "Call completed", timestamp: new Date().toLocaleTimeString() }
    ],
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("calls") as any).insert({
      lead_id: newRecord.lead_id,
      agent_name: newRecord.agent_name,
      duration_seconds: newRecord.duration_seconds,
      outcome: newRecord.outcome,
      sentiment: newRecord.sentiment,
      order_value: newRecord.order_value,
    });
  } catch (err) {
    console.warn("Supabase call insert skipped:", err);
  }

  localCallsStore = [newRecord, ...localCallsStore];
  saveLocalCalls(localCallsStore);
  return newRecord;
}

