import { createClient } from "./client";
import { WorkflowRule, ExecutionLogEntry } from "../workflows/types";

/**
 * Supabase Data Access Service for Agentic Workflows & Execution Audit Logs
 */

export async function fetchWorkflowsFromSupabase(): Promise<WorkflowRule[]> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return [];
  }

  return (data as any[]).map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description || "",
    enabled: w.is_active,
    trigger: w.trigger_event as any,
    conditions: (w.conditions || []) as any,
    actions: (w.actions || []) as any,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }));
}

export async function saveWorkflowToSupabase(rule: WorkflowRule): Promise<boolean> {
  const supabase = createClient() as any;

  const { error } = await supabase.from("workflows").upsert({
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
    console.error("[workflowService] Error saving workflow to Supabase:", error);
    return false;
  }

  return true;
}

export async function deleteWorkflowFromSupabase(ruleId: string): Promise<boolean> {
  const supabase = createClient() as any;

  const { error } = await supabase.from("workflows").delete().eq("id", ruleId);

  if (error) {
    console.error("[workflowService] Error deleting workflow from Supabase:", error);
    return false;
  }

  return true;
}

export async function fetchWorkflowExecutionsFromSupabase(): Promise<ExecutionLogEntry[]> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("workflow_executions")
    .select("*, workflows(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return (data as any[]).map((e) => ({
    id: e.id,
    ruleId: e.rule_id,
    ruleName: e.workflows?.name || "Workflow Rule",
    trigger: e.trigger_event as any,
    status: e.status as any,
    executedActions: (e.logs?.actions || []) as any,
    eventPayload: (e.logs?.payload || {}) as any,
    errorMessage: e.logs?.error || undefined,
    executedAt: e.created_at,
  }));
}

export async function saveWorkflowExecutionToSupabase(entry: ExecutionLogEntry): Promise<boolean> {
  const supabase = createClient() as any;

  const { error } = await supabase.from("workflow_executions").insert({
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
