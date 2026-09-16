"use server";

import {
  claimAssistanceRequestForWorkspace,
  createAssistanceRequestForWorkspace,
  resolveAssistanceRequestForWorkspace,
  type AssistanceRequestType,
} from "@/lib/dal/assistanceRequests";

export async function requestAssistanceAction(input: {
  queueItemId: string;
  requestType?: AssistanceRequestType;
  note?: string;
}) {
  return createAssistanceRequestForWorkspace(input);
}

export async function claimAssistanceRequestAction(requestId: string) {
  return claimAssistanceRequestForWorkspace(requestId);
}

export async function resolveAssistanceRequestAction(requestId: string) {
  return resolveAssistanceRequestForWorkspace(requestId);
}
