"use server";

import { createLeadForWorkspace, createLeadsForWorkspace, listLeadsForWorkspace, updateLeadStatusForWorkspace } from "@/lib/dal/leads";
import type { CreateLeadInput, LeadDTO } from "@/lib/dal/leads";
import {
  createOrderForWorkspace,
  listOrderProductCountsForWorkspace,
  reassignOrdersProductForWorkspace,
  updateOrderDetailsForWorkspace,
  updateOrderStatusForWorkspace,
} from "@/lib/dal/orders";
import type {
  CreateOrderInput,
  OrderDTO,
  ReassignOrdersResult,
  UpdateOrderDetailsInput,
  UpdateOrderStatusInput,
} from "@/lib/dal/orders";
import { createCallForWorkspace } from "@/lib/dal/calls";
import type { CallDTO, CreateCallInput } from "@/lib/dal/calls";
import { completeCallForWorkspace } from "@/lib/dal/callCompletion";
import type { CompleteCallDTO, CompleteCallInput } from "@/lib/dal/callCompletion";
import {
  getWorkspaceCall,
  listWorkspaceCallsInContext,
  listWorkspaceOrders,
  listWorkspaceOrdersForLead,
  listWorkspaceLeadActivity,
  listWorkspaceLeadActivityPage,
  listWorkspaceLeadActivityEvents,
} from "@/lib/dal/activity";
import { listCallReviewStatuses, type CallReviewStatus } from "@/lib/dal/callReviews";
import type { WorkspaceCallDTO, WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { Database } from "@/lib/supabase/types";
import type { CustomerActivityPageOptions } from "@/lib/customerActivity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";

export async function listLeadActivityPageAction(leadId: string, options?: CustomerActivityPageOptions) {
  return listWorkspaceLeadActivityPage(leadId, options);
}
export async function listLeadActivityEventsAction(leadId: string) {
  return listWorkspaceLeadActivityEvents(leadId);
}

type LeadStatus = Database["public"]["Tables"]["leads"]["Row"]["status"];

export async function listLeadsAction(options?: {
  workspaceId?: string;
  status?: LeadStatus;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Promise<LeadDTO[]> {
  return listLeadsForWorkspace(options);
}

export async function createLeadAction(input: CreateLeadInput, workspaceId?: string): Promise<LeadDTO> {
  return createLeadForWorkspace(input, workspaceId);
}

export async function createLeadsBatchAction(
  inputs: CreateLeadInput[],
  workspaceId?: string,
): Promise<LeadDTO[]> {
  return createLeadsForWorkspace(inputs, workspaceId);
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
  workspaceId?: string
): Promise<LeadDTO> {
  return updateLeadStatusForWorkspace(leadId, status, workspaceId);
}

export async function createOrderAction(input: CreateOrderInput, workspaceId?: string): Promise<OrderDTO> {
  return createOrderForWorkspace(input, workspaceId);
}

export async function updateOrderStatusAction(
  orderId: string,
  status: UpdateOrderStatusInput["status"],
  note?: string | null,
): Promise<OrderDTO> {
  return updateOrderStatusForWorkspace({ orderId, status, note });
}

export async function updateOrderDetailsAction(
  input: UpdateOrderDetailsInput,
): Promise<OrderDTO> {
  return updateOrderDetailsForWorkspace(input);
}

export async function reassignOrdersProductAction(
  sourceProductId: string,
  targetProductId: string,
  workspaceId?: string
): Promise<ReassignOrdersResult> {
  return reassignOrdersProductForWorkspace(sourceProductId, targetProductId, workspaceId);
}

export async function listOrderProductCountsAction(
  workspaceId?: string
): Promise<Record<string, number>> {
  return listOrderProductCountsForWorkspace(workspaceId);
}

export async function createCallAction(input: CreateCallInput, workspaceId?: string): Promise<CallDTO> {
  return createCallForWorkspace(input, workspaceId);
}

export async function completeCallAction(
  input: CompleteCallInput,
  workspaceId?: string
): Promise<CompleteCallDTO> {
  return completeCallForWorkspace(input, workspaceId);
}

export type WorkspaceCallWithReviewAccessDTO = WorkspaceCallDTO & {
  review_href: string | null;
  review_status: CallReviewStatus | null;
};

export async function listCallsAction(workspaceId?: string): Promise<WorkspaceCallWithReviewAccessDTO[]> {
  const context = await requireWorkspaceContext(workspaceId);
  const calls = await listWorkspaceCallsInContext(context);
  const canReview = context.role === "team_leader" || context.role === "administrator";
  const reviewStatuses = canReview
    ? await listCallReviewStatuses(context, calls.map((call) => call.id))
    : new Map<string, CallReviewStatus>();
  return calls.map((call) => ({
    ...call,
    review_href: canReview ? `/calls/${call.id}/review` : null,
    review_status: canReview ? reviewStatuses.get(call.id) || "not_reviewed" : null,
  }));
}

export async function getCallAction(
  callId: string,
  workspaceId?: string
): Promise<WorkspaceCallDTO | null> {
  return getWorkspaceCall(callId, workspaceId);
}

export async function listOrdersAction(workspaceId?: string): Promise<WorkspaceOrderDTO[]> {
  return listWorkspaceOrders(workspaceId);
}

export async function listLeadOrdersAction(
  leadId: string,
  workspaceId?: string
): Promise<WorkspaceOrderDTO[]> {
  return listWorkspaceOrdersForLead(leadId, workspaceId);
}

export async function listLeadActivityAction(
  leadId: string,
  workspaceId?: string
): Promise<{ calls: WorkspaceCallDTO[]; orders: WorkspaceOrderDTO[] }> {
  return listWorkspaceLeadActivity(leadId, workspaceId);
}
