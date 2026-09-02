"use server";

import {
  claimNextLeadForWorkspace,
  abortLeadCallStartForWorkspace,
  completeLeadCallForWorkspace,
  endLeadCallForWorkspace,
  getCurrentLeadForWorkspace,
  getScopedLeadForWorkspace,
  heartbeatLeadAssignmentForWorkspace,
  listQueueItemsForWorkspace,
  queueLeadForOperatorForWorkspace,
  reopenLeadAssignmentForWorkspace,
  reassignLeadAssignmentForWorkspace,
  releaseLeadAssignmentForWorkspace,
  setOperatorPresenceForWorkspace,
  startLeadCallForWorkspace,
} from "@/lib/dal/leadQueue";
import type {
  CompleteLeadCallInput,
  LeadQueueSnapshot,
  OperatorPresenceState,
  QueueCompletionDTO,
  QueueItemDTO,
} from "@/lib/dal/leadQueue";
import type { LeadDTO } from "@/lib/dal/leads";

export async function setOperatorPresenceAction(
  state: OperatorPresenceState,
  workspaceId?: string,
): Promise<{ workspace_id: string; operator_id: string; state: OperatorPresenceState; last_heartbeat_at: string }> {
  return setOperatorPresenceForWorkspace(state, workspaceId);
}

export async function getCurrentLeadAction(workspaceId?: string): Promise<LeadQueueSnapshot | null> {
  return getCurrentLeadForWorkspace(workspaceId);
}

export async function claimNextLeadAction(workspaceId?: string): Promise<LeadQueueSnapshot | null> {
  return claimNextLeadForWorkspace(workspaceId);
}

export async function startLeadCallAction(queueItemId: string): Promise<LeadQueueSnapshot> {
  return startLeadCallForWorkspace(queueItemId);
}

export async function heartbeatLeadAssignmentAction(
  queueItemId: string,
): Promise<{ queue_item_id: string; lease_expires_at: string | null }> {
  return heartbeatLeadAssignmentForWorkspace(queueItemId);
}

export async function abortLeadCallStartAction(
  queueItemId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  return abortLeadCallStartForWorkspace(queueItemId, reason);
}

export async function completeLeadCallAction(input: CompleteLeadCallInput): Promise<QueueCompletionDTO> {
  return completeLeadCallForWorkspace(input);
}

export async function endLeadCallAction(queueItemId: string): Promise<LeadQueueSnapshot> {
  return endLeadCallForWorkspace(queueItemId);
}

export async function listQueueItemsAction(workspaceId?: string): Promise<QueueItemDTO[]> {
  return listQueueItemsForWorkspace(workspaceId);
}

export async function releaseLeadAssignmentAction(
  queueItemId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  return releaseLeadAssignmentForWorkspace(queueItemId, reason);
}

export async function queueLeadForOperatorAction(
  queueItemId: string,
  operatorId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  return queueLeadForOperatorForWorkspace(queueItemId, operatorId, reason);
}

export async function reassignLeadAssignmentAction(
  queueItemId: string,
  operatorId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  return reassignLeadAssignmentForWorkspace(queueItemId, operatorId, reason);
}

export async function reopenLeadAssignmentAction(
  queueItemId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  return reopenLeadAssignmentForWorkspace(queueItemId, reason);
}

export async function getScopedLeadAction(leadId: string, workspaceId?: string): Promise<LeadDTO> {
  return getScopedLeadForWorkspace(leadId, workspaceId);
}
