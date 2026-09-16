import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";

export type AssistanceRequestType = "help" | "sos";
export type AssistanceRequestStatus = "open" | "claimed" | "resolved" | "cancelled";

type AssistanceRow = {
  id: string;
  workspace_id: string;
  team_id: string | null;
  operator_id: string;
  queue_item_id: string | null;
  lead_id: string | null;
  request_type: AssistanceRequestType;
  status: AssistanceRequestStatus;
  note: string;
  claimed_by: string | null;
  claimed_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };
type TeamRow = { id: string; name: string };

export interface AssistanceRequestDTO {
  id: string;
  workspaceId: string;
  teamId: string | null;
  teamName: string;
  operatorId: string;
  operatorName: string;
  operatorEmail: string;
  queueItemId: string | null;
  leadId: string | null;
  requestType: AssistanceRequestType;
  status: AssistanceRequestStatus;
  note: string;
  claimedBy: string | null;
  claimedByName: string | null;
  createdAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
}

const REQUEST_SELECT = "id, workspace_id, team_id, operator_id, queue_item_id, lead_id, request_type, status, note, claimed_by, claimed_at, resolved_by, resolved_at, created_at, updated_at";

function getErrorMessage(error: unknown, fallback: string): string {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
}

function validateRequestType(value: string): asserts value is AssistanceRequestType {
  if (value !== "help" && value !== "sos") {
    throw new DataAccessError("VALIDATION", "Assistance request type is invalid.");
  }
}

async function appendRequestEvent(
  supabase: SupabaseClient,
  request: AssistanceRow,
  eventType: "requested" | "cancelled",
  fromStatus: string | null,
  toStatus: string,
  actorId: string,
): Promise<void> {
  const { error } = await supabase.from("team_assistance_request_events").insert({
    workspace_id: request.workspace_id,
    request_id: request.id,
    actor_id: actorId,
    event_type: eventType,
    from_status: fromStatus,
    to_status: toStatus,
  });
  if (error) throw new DataAccessError("DATABASE", "Assistance request audit could not be saved.");
}

function mapRequest(
  row: AssistanceRow,
  profiles: Map<string, ProfileRow>,
  teams: Map<string, TeamRow>,
): AssistanceRequestDTO {
  const operator = profiles.get(row.operator_id);
  const claimedBy = row.claimed_by ? profiles.get(row.claimed_by) : null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    teamId: row.team_id,
    teamName: row.team_id ? teams.get(row.team_id)?.name || "Neznámý tým" : "Tým není uveden",
    operatorId: row.operator_id,
    operatorName: operator?.full_name?.trim() || operator?.email?.trim() || "Neznámý operátor",
    operatorEmail: operator?.email?.trim() || "",
    queueItemId: row.queue_item_id,
    leadId: row.lead_id,
    requestType: row.request_type,
    status: row.status,
    note: row.note,
    claimedBy: row.claimed_by,
    claimedByName: claimedBy?.full_name?.trim() || claimedBy?.email?.trim() || null,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    resolvedAt: row.resolved_at,
  };
}

async function loadRequestContext(
  supabase: SupabaseClient,
  rows: AssistanceRow[],
): Promise<{ profiles: Map<string, ProfileRow>; teams: Map<string, TeamRow> }> {
  const profileIds = Array.from(new Set(rows.flatMap((row) => [row.operator_id, row.claimed_by].filter((id): id is string => Boolean(id)))));
  const teamIds = Array.from(new Set(rows.map((row) => row.team_id).filter((id): id is string => Boolean(id))));
  const [profilesResult, teamsResult] = await Promise.all([
    profileIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds) : Promise.resolve({ data: [], error: null }),
    teamIds.length ? supabase.from("teams").select("id, name").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw new DataAccessError("DATABASE", "Assistance operator profiles could not be loaded.");
  if (teamsResult.error) throw new DataAccessError("DATABASE", "Assistance teams could not be loaded.");
  return {
    profiles: new Map(((profilesResult.data || []) as ProfileRow[]).map((profile) => [profile.id, profile])),
    teams: new Map(((teamsResult.data || []) as TeamRow[]).map((team) => [team.id, team])),
  };
}

export async function createAssistanceRequestForWorkspace(input: {
  queueItemId: string;
  requestType?: AssistanceRequestType;
  note?: string;
}): Promise<{ id: string; status: AssistanceRequestStatus }> {
  const context = await requireWorkspaceRole(["operator"]);
  validateRequestType(input.requestType || "help");
  if (!input.queueItemId.trim()) throw new DataAccessError("VALIDATION", "An active assignment is required.");
  const note = input.note?.trim() || "";
  if (note.length > 500) throw new DataAccessError("VALIDATION", "Assistance note is too long.");

  const supabase = await createDataClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("lead_queue_items")
    .select("id, workspace_id, team_id, lead_id, assigned_operator_id, state")
    .eq("id", input.queueItemId)
    .eq("workspace_id", context.workspaceId)
    .eq("assigned_operator_id", context.userId)
    .maybeSingle();
  if (assignmentError) throw new DataAccessError("DATABASE", "Active assignment could not be checked.");
  if (!assignment || !["assigned", "in_progress", "awaiting_outcome"].includes(assignment.state)) {
    throw new DataAccessError("VALIDATION", "Assistance requires an active assignment.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("team_assistance_requests")
    .select("id, status")
    .eq("workspace_id", context.workspaceId)
    .eq("operator_id", context.userId)
    .in("status", ["open", "claimed"])
    .limit(1)
    .maybeSingle();
  if (existingError) throw new DataAccessError("DATABASE", "Existing assistance request could not be checked.");
  if (existing) return { id: existing.id, status: existing.status as AssistanceRequestStatus };

  const { data: created, error: createError } = await supabase
    .from("team_assistance_requests")
    .insert({
      workspace_id: context.workspaceId,
      team_id: assignment.team_id || null,
      operator_id: context.userId,
      queue_item_id: assignment.id,
      lead_id: assignment.lead_id,
      request_type: input.requestType || "help",
      note,
    })
    .select(REQUEST_SELECT)
    .single();
  if (createError || !created) throw new DataAccessError("DATABASE", "Assistance request could not be created.");
  const row = created as AssistanceRow;
  await appendRequestEvent(supabase, row, "requested", null, "open", context.userId);
  return { id: row.id, status: row.status };
}

export async function listAssistanceRequestsForWorkspace(): Promise<AssistanceRequestDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("team_assistance_requests")
    .select(REQUEST_SELECT)
    .eq("workspace_id", context.workspaceId)
    .in("status", ["open", "claimed"])
    .order("request_type", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new DataAccessError("DATABASE", "Assistance requests could not be loaded.");
  const rows = (data || []) as AssistanceRow[];
  const { profiles, teams } = await loadRequestContext(supabase, rows);
  return rows.map((row) => mapRequest(row, profiles, teams));
}

export async function claimAssistanceRequestForWorkspace(requestId: string): Promise<boolean> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (!requestId.trim()) throw new DataAccessError("VALIDATION", "An assistance request is required.");
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("claim_team_assistance_request", { target_request_id: requestId });
  if (error) throw new DataAccessError("DATABASE", getErrorMessage(error, "Assistance request could not be claimed."));
  void context;
  return data === true;
}

export async function resolveAssistanceRequestForWorkspace(requestId: string): Promise<boolean> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (!requestId.trim()) throw new DataAccessError("VALIDATION", "An assistance request is required.");
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("resolve_team_assistance_request", { target_request_id: requestId });
  if (error) throw new DataAccessError("DATABASE", getErrorMessage(error, "Assistance request could not be resolved."));
  void context;
  return data === true;
}
