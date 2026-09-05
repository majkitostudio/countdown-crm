"use server";

import {
  getConversationBriefForWorkspace,
  type ConversationBriefDTO,
} from "@/lib/dal/conversationBrief";

export async function getConversationBriefAction(
  leadId: string,
  workspaceId?: string,
): Promise<ConversationBriefDTO> {
  return getConversationBriefForWorkspace(leadId, workspaceId);
}
