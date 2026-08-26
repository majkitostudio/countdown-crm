"use server";

import {
  createWorkflowExecutionForWorkspace,
  deleteWorkflowForWorkspace,
  listWorkflowExecutionsForWorkspace,
  listWorkflowsForWorkspace,
  saveWorkflowForWorkspace,
} from "@/lib/dal/workflows";
import type { ExecutionLogEntry, WorkflowRule } from "@/lib/workflows/types";
import type { WorkflowDispatchInput } from "@/lib/workflows/dispatcher";
import type { WorkflowDispatchResult } from "@/lib/workflows/types";
import { simulateWorkflowEventForWorkspace } from "@/lib/workflows/dispatcher";

export async function listWorkflowsAction(): Promise<WorkflowRule[]> {
  return listWorkflowsForWorkspace();
}

export async function saveWorkflowAction(rule: WorkflowRule): Promise<WorkflowRule> {
  return saveWorkflowForWorkspace(rule);
}

export async function deleteWorkflowAction(id: string): Promise<void> {
  return deleteWorkflowForWorkspace(id);
}

export async function listWorkflowExecutionsAction(): Promise<ExecutionLogEntry[]> {
  return listWorkflowExecutionsForWorkspace();
}

export async function createWorkflowExecutionAction(entry: ExecutionLogEntry): Promise<void> {
  if (entry.status === "success") {
    throw new Error("Successful workflow execution logs must be created by the server dispatcher.");
  }
  return createWorkflowExecutionForWorkspace(entry);
}

export async function simulateWorkflowEventAction(
  input: WorkflowDispatchInput,
): Promise<WorkflowDispatchResult> {
  return simulateWorkflowEventForWorkspace(input);
}
