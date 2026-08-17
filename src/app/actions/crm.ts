"use server";

import { createLeadForWorkspace, createLeadsForWorkspace, listLeadsForWorkspace, updateLeadStatusForWorkspace } from "@/lib/dal/leads";
import type { CreateLeadInput, LeadDTO } from "@/lib/dal/leads";
import { createOrderForWorkspace } from "@/lib/dal/orders";
import type { CreateOrderInput, OrderDTO } from "@/lib/dal/orders";
import { createCallForWorkspace } from "@/lib/dal/calls";
import type { CallDTO, CreateCallInput } from "@/lib/dal/calls";
import { completeCallForWorkspace } from "@/lib/dal/callCompletion";
import type { CompleteCallDTO, CompleteCallInput } from "@/lib/dal/callCompletion";
import {
  getWorkspaceCall,
  listWorkspaceCalls,
  listWorkspaceOrders,
  listWorkspaceOrdersForLead,
  listWorkspaceLeadActivity,
} from "@/lib/dal/activity";
import type { WorkspaceCallDTO, WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { Database } from "@/lib/supabase/types";

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

export async function createCallAction(input: CreateCallInput, workspaceId?: string): Promise<CallDTO> {
  return createCallForWorkspace(input, workspaceId);
}

export async function completeCallAction(
  input: CompleteCallInput,
  workspaceId?: string
): Promise<CompleteCallDTO> {
  return completeCallForWorkspace(input, workspaceId);
}

export async function listCallsAction(workspaceId?: string): Promise<WorkspaceCallDTO[]> {
  return listWorkspaceCalls(workspaceId);
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
