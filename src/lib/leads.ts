import { createClient } from "./supabase/client";
import { fetchLeadsFromSupabase, updateLeadStatusInSupabase } from "./supabase/leadsService";
import { getCurrentWorkspaceId } from "./supabase/workspace";

export type LeadStatus = "new" | "contacted" | "qualified" | "customer" | "unresponsive";

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  country: string;
  status: LeadStatus;
  ai_score: number;
  notes: string | null;
  company?: string | null;
  value?: number;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: "call" | "note" | "status_change" | "order";
  title: string;
  description: string;
  timestamp: string;
  agent_name?: string;
  ai_sentiment?: "Positive" | "Neutral" | "Negative" | "Urgent";
}

// Initial Mock Leads (Used when Supabase is not connected or for instant demo mode)
export const INITIAL_MOCK_LEADS: Lead[] = [
  {
    id: "lead-1",
    full_name: "Eleanor Vance",
    phone: "+420 774 123 890",
    email: "eleanor.vance@apexlogistics.cz",
    city: "Prague",
    country: "CZ",
    status: "qualified",
    ai_score: 92,
    notes: "Expresses high interest in anti-aging supplement stack. Decision maker with EUR 500/mo budget.",
    company: "Apex Logistics",
    value: 1250,
    last_contacted_at: "2026-08-01T10:15:00Z",
    created_at: "2026-07-28T09:00:00Z",
    updated_at: "2026-08-01T10:15:00Z",
  },
  {
    id: "lead-2",
    full_name: "Marcus Thorne",
    phone: "+420 608 991 234",
    email: "m.thorne@biotech-innovations.io",
    city: "Brno",
    country: "CZ",
    status: "new",
    ai_score: 88,
    notes: "Inquired via webform about organic skincare bundle. Requested callback around 2 PM.",
    company: "BioTech Innovations",
    value: 890,
    last_contacted_at: null,
    created_at: "2026-08-01T08:30:00Z",
    updated_at: "2026-08-01T08:30:00Z",
  },
  {
    id: "lead-3",
    full_name: "Sophia Martinez",
    phone: "+420 732 456 789",
    email: "sophia.martinez@lumina-beauty.com",
    city: "Ostrava",
    country: "CZ",
    status: "contacted",
    ai_score: 75,
    notes: "Spoke yesterday. Sensitive to price; needs discount offer or installment plan for premium package.",
    company: "Lumina Studio",
    value: 2100,
    last_contacted_at: "2026-07-31T14:20:00Z",
    created_at: "2026-07-25T11:00:00Z",
    updated_at: "2026-07-31T14:20:00Z",
  },
  {
    id: "lead-4",
    full_name: "Jan Novák",
    phone: "+420 603 112 233",
    email: "jan.novak@novak-tech.cz",
    city: "Plzeň",
    country: "CZ",
    status: "customer",
    ai_score: 96,
    notes: "Repeat customer. Placed order #ORD-8821 for Smart Fitness Scale. High cross-sell probability for supplements.",
    company: "Novák Tech s.r.o.",
    value: 3450,
    last_contacted_at: "2026-07-30T16:45:00Z",
    created_at: "2026-06-15T10:00:00Z",
    updated_at: "2026-07-30T16:45:00Z",
  },
  {
    id: "lead-5",
    full_name: "Klára Svobodová",
    phone: "+420 775 889 001",
    email: "klara.svoboda@design-hub.cz",
    city: "Liberec",
    country: "CZ",
    status: "unresponsive",
    ai_score: 34,
    notes: "3 failed call attempts. Left voicemail regarding special promo.",
    company: "Design Hub",
    value: 450,
    last_contacted_at: "2026-07-29T09:10:00Z",
    created_at: "2026-07-20T13:00:00Z",
    updated_at: "2026-07-29T09:10:00Z",
  },
  {
    id: "lead-6",
    full_name: "David Miller",
    phone: "+420 721 987 654",
    email: "d.miller@global-trade.com",
    city: "Prague",
    country: "CZ",
    status: "new",
    ai_score: 82,
    notes: "Imported via marketing campaign 'Summer Bio-Boost'. High potential value.",
    company: "Global Trade Ltd",
    value: 1750,
    last_contacted_at: null,
    created_at: "2026-08-01T07:15:00Z",
    updated_at: "2026-08-01T07:15:00Z",
  },
  {
    id: "lead-7",
    full_name: "Lucie Dvořáková",
    phone: "+420 602 345 678",
    email: "lucie.dvorakova@medicare.cz",
    city: "Olomouc",
    country: "CZ",
    status: "qualified",
    ai_score: 90,
    notes: "Clinic manager interested in bulk ordering Collagen Complex for patients.",
    company: "MediCare Clinic",
    value: 4200,
    last_contacted_at: "2026-07-31T11:00:00Z",
    created_at: "2026-07-22T08:30:00Z",
    updated_at: "2026-07-31T11:00:00Z",
  },
  {
    id: "lead-8",
    full_name: "Tomáš Kučera",
    phone: "+420 777 554 433",
    email: "tomas@kucera-fit.cz",
    city: "Hradec Králové",
    country: "CZ",
    status: "contacted",
    ai_score: 68,
    notes: "Fitness instructor, interested in partner affiliate program.",
    company: "Kučera Fitness",
    value: 950,
    last_contacted_at: "2026-07-30T13:15:00Z",
    created_at: "2026-07-26T15:20:00Z",
    updated_at: "2026-07-30T13:15:00Z",
  }
];

export const MOCK_LEAD_ACTIVITIES: Record<string, LeadActivity[]> = {
  "lead-1": [
    {
      id: "act-101",
      lead_id: "lead-1",
      type: "call",
      title: "Outbound Call — Product Inquiry",
      description: "Discussed Anti-Aging Supplement Stack. Lead asked about active ingredients and delivery time. Sent brochure via email.",
      timestamp: "2026-08-01T10:15:00Z",
      agent_name: "Sarah Connor",
      ai_sentiment: "Positive"
    },
    {
      id: "act-102",
      lead_id: "lead-1",
      type: "note",
      title: "AI Lead Scoring Update",
      description: "AI Score increased from 75 to 92 due to corporate domain (+10) and budget confirmation (+7).",
      timestamp: "2026-07-28T09:05:00Z",
      agent_name: "AI Copilot"
    }
  ],
  "lead-2": [
    {
      id: "act-201",
      lead_id: "lead-2",
      type: "note",
      title: "Webform Submission",
      description: "Submitted request for Organic Skincare Bundle info on landing page.",
      timestamp: "2026-08-01T08:30:00Z",
      agent_name: "System"
    }
  ],
  "lead-3": [
    {
      id: "act-301",
      lead_id: "lead-3",
      type: "call",
      title: "Outbound Call — Price Objection",
      description: "Lead stated price was 20% higher than competitors. Copilot suggested 3-month payment plan argument.",
      timestamp: "2026-07-31T14:20:00Z",
      agent_name: "Alex Vance",
      ai_sentiment: "Urgent"
    }
  ]
};

/**
 * Calculates dynamic AI Lead Score (0 - 100) based on lead traits
 */
export function calculateAiLeadScore(lead: Partial<Lead>): number {
  let score = 40; // Base baseline score

  // 1. Phone number validation check (+20)
  if (lead.phone && lead.phone.trim().length >= 9) {
    score += 20;
  }

  // 2. Email quality check (+15 for business email, +10 for standard)
  if (lead.email) {
    const email = lead.email.toLowerCase();
    if (email.includes("@gmail.com") || email.includes("@yahoo.com") || email.includes("@seznam.cz")) {
      score += 10;
    } else if (email.includes("@")) {
      score += 20; // Corporate domain domain
    }
  }

  // 3. City / Country bonus (+10)
  if (lead.city) {
    score += 10;
  }

  // 4. Status weighting
  if (lead.status === "customer") score += 20;
  else if (lead.status === "qualified") score += 15;
  else if (lead.status === "contacted") score += 5;
  else if (lead.status === "unresponsive") score -= 25;

  // 5. Notes / Intent indicators (+10)
  if (lead.notes && lead.notes.length > 20) {
    score += 10;
  }

  // Clamp within bounds [5, 99]
  return Math.min(99, Math.max(5, score));
}

const LEADS_STORAGE_KEY = "countdown_crm_leads_v1";

function loadLocalLeads(): Lead[] {
  if (typeof window === "undefined") return INITIAL_MOCK_LEADS;
  const stored = localStorage.getItem(LEADS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_LEADS));
    return INITIAL_MOCK_LEADS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_LEADS;
  }
}

function saveLocalLeads(leads: Lead[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  }
}

// In-memory store for demo persistence synced with localStorage
let localLeadsStore: Lead[] = loadLocalLeads();

/**
 * Fetch all leads with optional status filter, search query, and sorting
 */
export async function getLeads(options?: {
  status?: string;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Promise<Lead[]> {
  return fetchLeadsFromSupabase(options);
}

function filterAndSortLocalLeads(options?: {
  status?: string;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Lead[] {
  let result = [...localLeadsStore];

  if (options?.status && options.status !== "all") {
    result = result.filter((l) => l.status === options.status);
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.full_name.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        l.phone.includes(q) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.company && l.company.toLowerCase().includes(q))
    );
  }

  if (options?.sortBy === "name") {
    result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else if (options?.sortBy === "score") {
    result.sort((a, b) => b.ai_score - a.ai_score);
  } else {
    // default created / newest
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return result;
}

/**
 * Add new leads imported via CSV or form
 */
export async function addLeadsBatch(leads: Partial<Lead>[]): Promise<Lead[]> {
  const newLeads: Lead[] = leads.map((item, index) => {
    const calculatedScore = calculateAiLeadScore(item);
    const now = new Date().toISOString();
    return {
      id: item.id || `lead-imported-${Date.now()}-${index}`,
      full_name: item.full_name || "Unknown Lead",
      phone: item.phone || "",
      email: item.email || null,
      city: item.city || "Prague",
      country: item.country || "CZ",
      status: (item.status as LeadStatus) || "new",
      ai_score: item.ai_score || calculatedScore,
      notes: item.notes || "Imported lead",
      company: item.company || null,
      value: item.value || 500,
      last_contacted_at: null,
      created_at: now,
      updated_at: now,
    };
  });

  // Try saving to Supabase
  try {
    const supabase = createClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error("No active workspace");
    const payload = newLeads.map((l) => ({
      workspace_id: workspaceId,
      full_name: l.full_name,
      phone: l.phone,
      email: l.email,
      city: l.city,
      country: l.country,
      status: l.status,
      ai_score: l.ai_score,
      notes: l.notes,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("leads") as any).insert(payload).select();

    if (!error && data) {
      console.log("Successfully inserted leads into Supabase");
    }
  } catch (err) {
    console.warn("Supabase batch insert warning, using local store:", err);
  }

  // Prepend to local store & persist
  localLeadsStore = [...newLeads, ...localLeadsStore];
  saveLocalLeads(localLeadsStore);
  return newLeads;
}

/**
 * Update single lead status or notes
 */
export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  if (!updates.status) {
    throw new Error("Only lead status updates are supported by the Supabase lead service");
  }

  const saved = await updateLeadStatusInSupabase(id, updates.status);
  if (!saved) {
    throw new Error("Lead status was not saved to Supabase");
  }

  const leads = await fetchLeadsFromSupabase();
  return leads.find((lead) => lead.id === id) || null;
}
