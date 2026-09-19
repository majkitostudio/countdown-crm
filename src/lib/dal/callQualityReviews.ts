import "server-only";

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import {
  combineCallQualityResults,
  evaluateDeterministicCallQuality,
  type CallQualityInput,
  type CallQualityReviewResult,
  type CallQualityReviewStatus,
  type CallQualitySection,
  type CallQualitySignal,
} from "@/lib/callQualityReview";
import { evaluateCallQualityWithGemini, GeminiCallQualityError } from "@/lib/ai/geminiCallQuality";
import { requireWorkspaceRole, type WorkspaceContext } from "@/lib/dal/workspace";

export interface CallQualityReviewDTO {
  id: string;
  callId: string;
  status: CallQualityReviewStatus;
  signals: CallQualitySignal[];
  missingSections: CallQualitySection[];
  reasons: string[];
  confidence: number | null;
  provider: "gemini" | "unavailable";
  model: string | null;
  errorCode: string | null;
  evaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  call: {
    createdAt: string;
    durationSeconds: number;
    outcome: string;
    failReason: string | null;
    operatorNote: string | null;
  };
  operator: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
}

type QualityRow = {
  id: string;
  workspace_id: string;
  call_id: string;
  status: CallQualityReviewStatus;
  signals: string[];
  missing_sections: string[];
  reasons: string[];
  confidence: number | string | null;
  provider: "gemini" | "unavailable";
  model: string | null;
  error_code: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
};

type CallQualitySourceRow = {
  id: string;
  lead_id: string | null;
  agent_id: string | null;
  duration_seconds: number;
  outcome: string;
  fail_reason: string | null;
  operator_note: string | null;
  transcript: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };
type LeadRow = { id: string; full_name: string | null };

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function toReviewDTO(
  row: QualityRow,
  call: CallQualitySourceRow,
  operator: ProfileRow | null,
  customer: LeadRow | null,
): CallQualityReviewDTO {
  return {
    id: row.id,
    callId: row.call_id,
    status: row.status,
    signals: safeStringArray(row.signals) as CallQualitySignal[],
    missingSections: safeStringArray(row.missing_sections) as CallQualitySection[],
    reasons: safeStringArray(row.reasons),
    confidence: row.confidence === null ? null : Number(row.confidence),
    provider: row.provider,
    model: row.model,
    errorCode: row.error_code,
    evaluatedAt: row.evaluated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    call: {
      createdAt: call.created_at,
      durationSeconds: call.duration_seconds,
      outcome: call.outcome,
      failReason: call.fail_reason,
      operatorNote: call.operator_note,
    },
    operator: operator
      ? { id: operator.id, name: operator.full_name?.trim() || operator.email?.trim() || "Neznámý operátor" }
      : null,
    customer: customer
      ? { id: customer.id, name: customer.full_name?.trim() || "Neznámý klient" }
      : null,
  };
}

function mapErrorCode(error: unknown): string {
  return error instanceof GeminiCallQualityError ? error.code : "PROVIDER";
}

function buildInput(call: CallQualitySourceRow): CallQualityInput {
  return {
    operatorNote: call.operator_note,
    transcript: call.transcript,
    durationSeconds: call.duration_seconds,
    outcome: call.outcome,
    failReason: call.fail_reason,
  };
}

const QUALITY_SELECT = "id, workspace_id, call_id, status, signals, missing_sections, reasons, confidence, provider, model, error_code, evaluated_at, created_at, updated_at";

async function ensurePendingQualityReview(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  callId: string,
): Promise<void> {
  const { error } = await admin
    .from("call_quality_reviews")
    .upsert({
      workspace_id: workspaceId,
      call_id: callId,
      status: "pending",
      provider: "unavailable",
      signals: [],
      missing_sections: [],
      reasons: [],
      confidence: null,
      error_code: null,
      evaluated_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "call_id", ignoreDuplicates: true });
  if (error) throw new DataAccessError("DATABASE", "AI quality review could not be queued.");
}

async function saveReview(
  admin: ReturnType<typeof createAdminClient>,
  callId: string,
  claimToken: string,
  result: CallQualityReviewResult,
  provider: "gemini" | "unavailable",
  model: string | null,
  errorCode: string | null,
): Promise<QualityRow> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("call_quality_reviews")
    .update({
      status: result.status,
      signals: result.signals,
      missing_sections: result.missingSections,
      reasons: result.reasons,
      confidence: result.confidence,
      provider,
      model,
      error_code: errorCode,
      evaluated_at: now,
      updated_at: now,
      claim_token: null,
      claim_expires_at: null,
      last_error_code: errorCode,
    })
    .eq("call_id", callId)
    .eq("claim_token", claimToken)
    .select(QUALITY_SELECT)
    .single();
  if (error || !data) throw new DataAccessError("DATABASE", "AI quality result could not be saved.");
  return data as QualityRow;
}

async function processCallQualityReviewForWorkspace(callId: string, workspaceId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: call, error: callError } = await admin
    .from("calls")
    .select("id, workspace_id, lead_id, agent_id, duration_seconds, outcome, fail_reason, operator_note, transcript, created_at")
    .eq("id", callId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (callError) throw new DataAccessError("DATABASE", "Completed call could not be loaded for AI quality review.");
  if (!call) throw new DataAccessError("NOT_FOUND", "Completed call was not found for AI quality review.");

  const sourceCall = call as CallQualitySourceRow;
  const deterministic = evaluateDeterministicCallQuality(buildInput(sourceCall));
  const claimToken = crypto.randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc("claim_call_quality_review", {
    p_workspace_id: workspaceId,
    p_call_id: callId,
    p_claim_token: claimToken,
    p_lease_seconds: 120,
  });
  if (claimError) throw new DataAccessError("DATABASE", "AI quality review could not be claimed.");
  if (claimed !== true) return;

  const model = process.env.GEMINI_QUALITY_MODEL?.trim() || "gemini-3.6-flash";
  try {
    const gemini = await evaluateCallQualityWithGemini(buildInput(sourceCall));
    await saveReview(admin, callId, claimToken, combineCallQualityResults(deterministic, gemini), "gemini", model, null);
  } catch (error) {
    await saveReview(admin, callId, claimToken, combineCallQualityResults(deterministic, null), "unavailable", null, mapErrorCode(error));
  }
}

/**
 * Creates the pending row immediately, then runs Gemini after the response.
 * The AI can therefore never delay saving a real call.
 */
export async function reviewCompletedCallForWorkspace(callId: string, workspaceId: string): Promise<void> {
  const admin = createAdminClient();
  await ensurePendingQualityReview(admin, workspaceId, callId);

  try {
    after(() => processCallQualityReviewForWorkspace(callId, workspaceId).catch((error) => {
      console.warn("Call quality review processing failed after response.", error);
    }));
  } catch (error) {
    // This can happen only when a DAL function is used outside a Next request
    // (for example from a maintenance script). The pending row remains durable
    // and can be processed by a later retry; it must not block call creation.
    console.warn("Call quality review was queued without an after-response runner.", error);
  }
}

async function loadCallQualityReviews(context: WorkspaceContext, operatorIds?: string[]): Promise<CallQualityReviewDTO[]> {
  const supabase = await createDataClient();
  const { data: qualityData, error: qualityError } = await supabase
    .from("call_quality_reviews")
    .select("id, workspace_id, call_id, status, signals, missing_sections, reasons, confidence, provider, model, error_code, evaluated_at, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (qualityError) throw new DataAccessError("DATABASE", "AI quality reviews could not be loaded.");
  const qualityRows = (qualityData || []) as unknown as QualityRow[];
  const callIds = qualityRows.map((row) => row.call_id);
  if (callIds.length === 0) return [];

  let callsQuery = supabase
    .from("calls")
    .select("id, lead_id, agent_id, duration_seconds, outcome, fail_reason, operator_note, transcript, created_at")
    .eq("workspace_id", context.workspaceId)
    .in("id", callIds);
  if (operatorIds && operatorIds.length > 0) {
    callsQuery = callsQuery.in("agent_id", operatorIds);
  }
  const { data: callsData, error: callsError } = await callsQuery;
  if (callsError) throw new DataAccessError("DATABASE", "Calls for AI quality reviews could not be loaded.");

  const calls = (callsData || []) as unknown as CallQualitySourceRow[];
  const callById = new Map(calls.map((call) => [call.id, call]));
  const profileIds = Array.from(new Set(calls.map((call) => call.agent_id).filter((id): id is string => Boolean(id))));
  const leadIds = Array.from(new Set(calls.map((call) => call.lead_id).filter((id): id is string => Boolean(id))));
  const [profilesResult, leadsResult] = await Promise.all([
    profileIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds) : Promise.resolve({ data: [], error: null }),
    leadIds.length ? supabase.from("leads").select("id, full_name").eq("workspace_id", context.workspaceId).in("id", leadIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error || leadsResult.error) throw new DataAccessError("DATABASE", "AI quality review attribution could not be loaded.");

  const profiles = (profilesResult.data || []) as ProfileRow[];
  const leads = (leadsResult.data || []) as LeadRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  return qualityRows.flatMap((row) => {
    const call = callById.get(row.call_id);
    if (!call) return [];
    return [toReviewDTO(row, call, call.agent_id ? profileById.get(call.agent_id) || null : null, call.lead_id ? leadById.get(call.lead_id) || null : null)];
  });
}

export async function listCallQualityReviewsForWorkspace(
  workspaceId?: string,
  options?: { operatorIds?: string[] },
): Promise<CallQualityReviewDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], workspaceId);
  return loadCallQualityReviews(context, options?.operatorIds);
}
