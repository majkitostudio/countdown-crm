import { createClient } from "./client";
import { Database } from "./types";
import { WorkflowRule, ExecutionLogEntry } from "../workflows/types";
import { getCurrentWorkspaceId } from "./workspace";

type WorkflowRow = Database["public"]["Tables"]["workflows"]["Row"];
type ExecutionRow = Database["public"]["Tables"]["workflow_executions"]["Row"];

function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

/**
 * Supabase Data Access Service for Agentic Workflows & Execution Audit Logs
 */

export async function fetchWorkflowsFromSupabase(): Promise<WorkflowRule[]> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Workflow query failed");
  }

  if (!data) {
    return [];
  }

  return (data as WorkflowRow[]).map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description || "",
    enabled: w.is_active,
    trigger: w.trigger_event as WorkflowRule["trigger"],
    conditions: (w.conditions || []) as unknown as WorkflowRule["conditions"],
    actions: (w.actions || []) as unknown as WorkflowRule["actions"],
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }));
}

export async function saveWorkflowToSupabase(rule: WorkflowRule): Promise<boolean> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase.from("workflows").upsert({
    workspace_id: workspaceId,
    id: rule.id.startsWith("rule-") ? undefined : rule.id,
    name: rule.name,
    description: rule.description || null,
    trigger_event: rule.trigger,
    conditions: JSON.parse(JSON.stringify(rule.conditions || [])),
    actions: JSON.parse(JSON.stringify(rule.actions || [])),
    is_active: rule.enabled,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error("Workflow save failed");
  }

  return true;
}

export async function deleteWorkflowFromSupabase(ruleId: string): Promise<boolean> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase.from("workflows").delete().eq("id", ruleId).eq("workspace_id", workspaceId);

  if (error) {
    throw new Error("Workflow delete failed");
  }

  return true;
}

export async function fetchWorkflowExecutionsFromSupabase(): Promise<ExecutionLogEntry[]> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("workflow_executions")
    .select("*, workflows(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("Workflow execution query failed");
  }

  if (!data) {
    return [];
  }

  return (data as unknown as (ExecutionRow & { workflows?: { name: string } | null })[]).map((e) => {
    const logsObj = (e.logs as Record<string, unknown>) || {};
    return {
      id: e.id,
      ruleId: e.rule_id || "",
      ruleName: e.workflows?.name || "Workflow Rule",
      trigger: e.trigger_event as ExecutionLogEntry["trigger"],
      status: e.status as ExecutionLogEntry["status"],
      executedActions: (logsObj.actions || []) as unknown as ExecutionLogEntry["executedActions"],
      eventPayload: (logsObj.payload || {}) as unknown as ExecutionLogEntry["eventPayload"],
      errorMessage: (logsObj.error as string) || undefined,
      executedAt: e.created_at,
    };
  });
}

export async function saveWorkflowExecutionToSupabase(entry: ExecutionLogEntry): Promise<boolean> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase.from("workflow_executions").insert({
    workspace_id: workspaceId,
    rule_id: entry.ruleId.startsWith("rule-") ? null : entry.ruleId,
    trigger_event: entry.trigger,
    status: entry.status,
    execution_time_ms: 50,
    logs: {
      actions: entry.executedActions,
      payload: entry.eventPayload,
      error: entry.errorMessage || null,
    },
  });

  if (error) {
    console.warn("[workflowService] Failed to record workflow execution in Supabase:", error);
    return false;
  }

  return true;
}
