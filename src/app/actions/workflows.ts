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
import { requireWorkspaceRole } from "@/lib/dal/workspace";

const WORKFLOW_MANAGEMENT_ROLES = ["team_leader", "administrator"] as const;

async function requireWorkflowManagementAccess(): Promise<void> {
  await requireWorkspaceRole(WORKFLOW_MANAGEMENT_ROLES);
}

export async function listWorkflowsAction(): Promise<WorkflowRule[]> {
  await requireWorkflowManagementAccess();
  return listWorkflowsForWorkspace();
}

export async function saveWorkflowAction(rule: WorkflowRule): Promise<WorkflowRule> {
  await requireWorkflowManagementAccess();
  return saveWorkflowForWorkspace(rule);
}

export async function deleteWorkflowAction(id: string): Promise<void> {
  await requireWorkflowManagementAccess();
  return deleteWorkflowForWorkspace(id);
}

export async function listWorkflowExecutionsAction(): Promise<ExecutionLogEntry[]> {
  await requireWorkflowManagementAccess();
  return listWorkflowExecutionsForWorkspace();
}

export async function createWorkflowExecutionAction(entry: ExecutionLogEntry): Promise<void> {
  await requireWorkflowManagementAccess();
  if (entry.status === "success") {
    throw new Error("Successful workflow execution logs must be created by the server dispatcher.");
  }
  return createWorkflowExecutionForWorkspace(entry);
}

export async function simulateWorkflowEventAction(
  input: WorkflowDispatchInput,
): Promise<WorkflowDispatchResult> {
  await requireWorkflowManagementAccess();
  return simulateWorkflowEventForWorkspace(input);
}
