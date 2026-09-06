import "server-only";

import { parseCallTranscript, type CallTranscript } from "@/lib/callTranscript";
import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type SessionRow = Database["public"]["Tables"]["telephony_call_sessions"]["Row"];
type RevisionRow = Database["public"]["Tables"]["call_review_revisions"]["Row"];

export type CallReviewScriptEvidence =
  | {
      kind: "published_version";
      productId: string;
      productTitle: string;
      versionId: string;
      versionNumber: number;
      html: string;
      capturedAt: string;
    }
  | {
      kind: "built_in_fallback";
      productId: string;
      productTitle: string;
      html: string;
      capturedAt: string;
    }
  | { kind: "unavailable"; capturedAt: string }
  | { kind: "not_recorded" };

export interface CallReviewRevisionDTO {
  id: string;
  callId: string;
  revisionNumber: number;
  verdict: string;
  coachingNote: string;
  correctionReason: string | null;
  reviewer: { id: string; name: string | null };
  supersedesRevisionId: string | null;
  createdAt: string;
}

export interface CallReviewDTO {
  call: {
    id: string;
    createdAt: string;
    durationSeconds: number;
    outcome: string | null;
    failReason: string | null;
    operatorNote: string | null;
    callbackScheduledAt: string | null;
  };
  customer: { id: string; name: string | null } | null;
  operator: { id: string; name: string | null } | null;
  callSource: "telnyx" | "local_sip" | "simulation" | "not_recorded";
  transcript: CallTranscript;
  script: CallReviewScriptEvidence;
  revisions: CallReviewRevisionDTO[];
}

export interface RecordCallReviewInput {
  callId: string;
  expectedRevision: number;
  verdict: string;
  coachingNote: string;
  correctionReason?: string | null;
}

const CALL_SELECT = "id, workspace_id, lead_id, agent_id, duration_seconds, outcome, fail_reason, operator_note, callback_scheduled_at, transcript, created_at";
const SESSION_SELECT = "provider, script_source, script_product_id, script_product_title, script_version_id, script_version_number, script_snapshot_html, script_captured_at";
const REVISION_SELECT = "id, call_id, revision_number, verdict, coaching_note, correction_reason, reviewer_id, supersedes_revision_id, created_at";

function mapScriptEvidence(session: Pick<
  SessionRow,
  | "script_source"
  | "script_product_id"
  | "script_product_title"
  | "script_version_id"
  | "script_version_number"
  | "script_snapshot_html"
  | "script_captured_at"
> | null): CallReviewScriptEvidence {
  if (!session?.script_source || !session.script_captured_at) {
    return { kind: "not_recorded" };
  }

  if (session.script_source === "unavailable") {
    return { kind: "unavailable", capturedAt: session.script_captured_at };
  }

  if (
    !session.script_product_id
    || !session.script_product_title
    || !session.script_snapshot_html
  ) {
    return { kind: "not_recorded" };
  }

  if (session.script_source === "built_in_fallback") {
    return {
      kind: "built_in_fallback",
      productId: session.script_product_id,
      productTitle: session.script_product_title,
      html: session.script_snapshot_html,
      capturedAt: session.script_captured_at,
    };
  }

  if (
    session.script_source === "published_version"
    && session.script_version_id
    && session.script_version_number !== null
  ) {
    return {
      kind: "published_version",
      productId: session.script_product_id,
      productTitle: session.script_product_title,
      versionId: session.script_version_id,
      versionNumber: session.script_version_number,
      html: session.script_snapshot_html,
      capturedAt: session.script_captured_at,
    };
  }

  return { kind: "not_recorded" };
}

function mapRevision(
  row: RevisionRow,
  profileNames: ReadonlyMap<string, string>,
): CallReviewRevisionDTO {
  return {
    id: row.id,
    callId: row.call_id,
    revisionNumber: row.revision_number,
    verdict: row.verdict,
    coachingNote: row.coaching_note,
    correctionReason: row.correction_reason,
    reviewer: {
      id: row.reviewer_id,
      name: profileNames.get(row.reviewer_id) || null,
    },
    supersedesRevisionId: row.supersedes_revision_id,
    createdAt: row.created_at,
  };
}

export async function getCallReview(callId: string): Promise<CallReviewDTO> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (typeof callId !== "string" || !callId.trim()) {
    throw new DataAccessError("VALIDATION", "Call ID is required.");
  }

  const supabase = await createDataClient();
  const { data: callData, error: callError } = await supabase
    .from("calls")
    .select(CALL_SELECT)
    .eq("id", callId)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (callError) {
    throw new DataAccessError("DATABASE", "Unable to load the call for review.");
  }
  if (!callData) {
    throw new DataAccessError("NOT_FOUND", "Call was not found in this workspace.");
  }

  const call = callData as Pick<
    CallRow,
    | "id"
    | "workspace_id"
    | "lead_id"
    | "agent_id"
    | "duration_seconds"
    | "outcome"
    | "fail_reason"
    | "operator_note"
    | "callback_scheduled_at"
    | "transcript"
    | "created_at"
  >;

  const leadPromise = call.lead_id
    ? supabase
        .from("leads")
        .select("id, full_name")
        .eq("id", call.lead_id)
        .eq("workspace_id", context.workspaceId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const sessionPromise = supabase
    .from("telephony_call_sessions")
    .select(SESSION_SELECT)
    .eq("completed_call_id", call.id)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();
  const revisionsPromise = supabase
    .from("call_review_revisions")
    .select(REVISION_SELECT)
    .eq("call_id", call.id)
    .eq("workspace_id", context.workspaceId)
    .order("revision_number", { ascending: true });

  const [leadResult, sessionResult, revisionsResult] = await Promise.all([
    leadPromise,
    sessionPromise,
    revisionsPromise,
  ]);

  if (leadResult.error || sessionResult.error || revisionsResult.error) {
    throw new DataAccessError("DATABASE", "Unable to load all call review evidence.");
  }

  const revisionRows = (revisionsResult.data || []) as RevisionRow[];
  const profileIds = [...new Set([
    ...(call.agent_id ? [call.agent_id] : []),
    ...revisionRows.map((revision) => revision.reviewer_id),
  ])];
  let profileNames = new Map<string, string>();

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    if (profileError) {
      throw new DataAccessError("DATABASE", "Unable to load call review people.");
    }
    profileNames = new Map(
      (profileData || []).map((profile) => [profile.id, profile.full_name] as const),
    );
  }

  const session = sessionResult.data as Pick<
    SessionRow,
    | "provider"
    | "script_source"
    | "script_product_id"
    | "script_product_title"
    | "script_version_id"
    | "script_version_number"
    | "script_snapshot_html"
    | "script_captured_at"
  > | null;
  const lead = leadResult.data as { id: string; full_name: string } | null;

  return {
    call: {
      id: call.id,
      createdAt: call.created_at,
      durationSeconds: call.duration_seconds,
      outcome: call.outcome,
      failReason: call.fail_reason,
      operatorNote: call.operator_note,
      callbackScheduledAt: call.callback_scheduled_at,
    },
    customer: call.lead_id
      ? { id: call.lead_id, name: lead?.full_name || null }
      : null,
    operator: call.agent_id
      ? { id: call.agent_id, name: profileNames.get(call.agent_id) || null }
      : null,
    callSource: session?.provider || "not_recorded",
    transcript: parseCallTranscript(call.transcript),
    script: mapScriptEvidence(session),
    revisions: revisionRows.map((revision) => mapRevision(revision, profileNames)),
  };
}

function validateReviewInput(input: RecordCallReviewInput) {
  if (!input || typeof input !== "object") {
    throw new DataAccessError("VALIDATION", "Call review input is invalid.");
  }

  const callId = typeof input.callId === "string" ? input.callId.trim() : "";
  const verdict = typeof input.verdict === "string" ? input.verdict.trim() : "";
  const coachingNote = typeof input.coachingNote === "string" ? input.coachingNote.trim() : "";
  const correctionReason = typeof input.correctionReason === "string"
    ? input.correctionReason.trim() || null
    : null;

  if (!callId) {
    throw new DataAccessError("VALIDATION", "Call ID is required.");
  }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new DataAccessError("VALIDATION", "Expected review revision is invalid.");
  }
  if (verdict.length < 1 || verdict.length > 200) {
    throw new DataAccessError("VALIDATION", "Verdict must be between 1 and 200 characters.");
  }
  if (coachingNote.length < 3 || coachingNote.length > 4000) {
    throw new DataAccessError("VALIDATION", "Coaching note must be between 3 and 4,000 characters.");
  }
  if (input.expectedRevision === 0 && correctionReason !== null) {
    throw new DataAccessError("VALIDATION", "Initial review cannot contain a correction reason.");
  }
  if (input.expectedRevision > 0 && (!correctionReason || correctionReason.length < 3 || correctionReason.length > 1000)) {
    throw new DataAccessError("VALIDATION", "Correction reason must be between 3 and 1,000 characters.");
  }

  return {
    callId,
    expectedRevision: input.expectedRevision,
    verdict,
    coachingNote,
    correctionReason,
  };
}

export async function recordCallReview(
  input: RecordCallReviewInput,
): Promise<CallReviewRevisionDTO> {
  await requireWorkspaceRole(["team_leader", "administrator"]);
  const validated = validateReviewInput(input);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .rpc("record_call_review_revision", {
      p_call_id: validated.callId,
      p_expected_revision: validated.expectedRevision,
      p_verdict: validated.verdict,
      p_coaching_note: validated.coachingNote,
      p_correction_reason: validated.correctionReason,
    })
    .single();

  if (error || !data) {
    if (error?.message?.includes("Review has changed; reload and try again")) {
      throw new DataAccessError("CONFLICT", "Review has changed; reload and try again.");
    }
    throw new DataAccessError("DATABASE", "Unable to record the call review.");
  }

  return mapRevision(data as RevisionRow, new Map());
}
