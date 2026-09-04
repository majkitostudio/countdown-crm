"use server";

import {
  listOperatorCalendarEntriesForWorkspace,
  type CalendarLoadResult,
} from "@/lib/dal/calendar";
import {
  listScheduledCallbacksForWorkspace,
  type ScheduledCallbackDTO,
} from "@/lib/dal/leadQueue";
import {
  cancelOperatorReminderForWorkspace,
  completeOperatorReminderForWorkspace,
  createOperatorReminderForWorkspace,
  updateOperatorReminderForWorkspace,
  type CreateOperatorReminderInput,
  type OperatorReminderDTO,
  type UpdateOperatorReminderInput,
} from "@/lib/dal/operatorReminders";

export async function listCalendarEntriesAction(
  from?: string,
  to?: string,
  workspaceId?: string,
): Promise<CalendarLoadResult> {
  return listOperatorCalendarEntriesForWorkspace(from, to, workspaceId);
}

export async function listScheduledCallbacksAction(
  from: string,
  to: string,
  workspaceId?: string,
): Promise<ScheduledCallbackDTO[]> {
  return listScheduledCallbacksForWorkspace(from, to, workspaceId);
}

export async function createReminderAction(
  input: CreateOperatorReminderInput,
  workspaceId?: string,
): Promise<OperatorReminderDTO> {
  return createOperatorReminderForWorkspace(input, workspaceId);
}

export async function updateReminderAction(
  reminderId: string,
  input: UpdateOperatorReminderInput,
  workspaceId?: string,
): Promise<OperatorReminderDTO> {
  return updateOperatorReminderForWorkspace(reminderId, input, workspaceId);
}

export async function completeReminderAction(
  reminderId: string,
  workspaceId?: string,
): Promise<OperatorReminderDTO> {
  return completeOperatorReminderForWorkspace(reminderId, workspaceId);
}

export async function cancelReminderAction(
  reminderId: string,
  workspaceId?: string,
): Promise<OperatorReminderDTO> {
  return cancelOperatorReminderForWorkspace(reminderId, workspaceId);
}
