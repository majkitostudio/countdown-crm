"use server";

import {
  createWorkflowExecutionForWorkspace,
  deleteWorkflowForWorkspace,
  listWorkflowExecutionsForWorkspace,
  listWorkflowsForWorkspace,
  saveWorkflowForWorkspace,
} from "@/lib/dal/workflows";
import type { ExecutionLogEntry, WorkflowRule } from "@/lib/workflows/types";

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
  return createWorkflowExecutionForWorkspace(entry);
}
