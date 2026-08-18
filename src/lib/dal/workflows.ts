import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";
import type {
  ActionType,
  ExecutionLogEntry,
  ExecutionStatus,
  TriggerCondition,
  TriggerType,
  WorkflowAction,
  WorkflowRule,
} from "@/lib/workflows/types";

type WorkflowRow = Database["public"]["Tables"]["workflows"]["Row"];
type ExecutionRow = Database["public"]["Tables"]["workflow_executions"]["Row"];

const WORKFLOW_SELECT =
  "id, workspace_id, name, description, trigger_event, conditions, actions, is_active, created_at, updated_at";
const EXECUTION_SELECT =
  "id, workspace_id, rule_id, trigger_event, status, logs, created_at";

const TRIGGERS: TriggerType[] = [
  "on_call_ended",
  "on_lead_status_changed",
  "on_order_placed",
  "on_lead_created",
];
const ACTIONS: ActionType[] = [
  "compute_ai_summary",
  "send_email_followup",
  "update_lead_status",
  "notify_manager",
  "send_webhook",
];
const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
] as const;
const EXECUTION_STATUSES: ExecutionStatus[] = ["success", "failure", "skipped"];

function isTriggerType(value: unknown): value is TriggerType {
  return typeof value === "string" && TRIGGERS.includes(value as TriggerType);
}

function isActionType(value: unknown): value is ActionType {
  return typeof value === "string" && ACTIONS.includes(value as ActionType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateConditions(conditions: unknown): TriggerCondition[] {
  if (!Array.isArray(conditions) || conditions.length > 20) {
    throw new DataAccessError("VALIDATION", "Workflow conditions are invalid.");
  }

  return conditions.map((condition) => {
    if (!isRecord(condition)) {
      throw new DataAccessError("VALIDATION", "Workflow condition is invalid.");
    }

    const field = condition.field;
    const operator = condition.operator;
    const value = condition.value;
    if (
      typeof field !== "string" ||
      !field.trim() ||
      field.length > 100 ||
      !CONDITION_OPERATORS.includes(operator as typeof CONDITION_OPERATORS[number]) ||
      typeof value !== "string" ||
      value.length > 500
    ) {
      throw new DataAccessError("VALIDATION", "Workflow condition is invalid.");
    }

    return {
      field: field.trim(),
      operator: operator as TriggerCondition["operator"],
      value,
    };
  });
}

function validateActions(actions: unknown): WorkflowAction[] {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 20) {
    throw new DataAccessError("VALIDATION", "Workflow requires between 1 and 20 actions.");
  }

  return actions.map((action) => {
    if (!isRecord(action) || !isActionType(action.type) || !isRecord(action.config)) {
      throw new DataAccessError("VALIDATION", "Workflow action is invalid.");
    }

    const config: Record<string, string> = {};
    for (const [key, value] of Object.entries(action.config)) {
      if (key.length > 100 || typeof value !== "string" || value.length > 2000) {
        throw new DataAccessError("VALIDATION", "Workflow action configuration is invalid.");
      }
      config[key] = value;
    }

    return { type: action.type, config };
  });
}

function validateWorkflow(rule: WorkflowRule): WorkflowRule {
  if (!rule || typeof rule !== "object") {
    throw new DataAccessError("VALIDATION", "Workflow rule is invalid.");
  }

  if (typeof rule.name !== "string" || !rule.name.trim() || rule.name.length > 200) {
    throw new DataAccessError("VALIDATION", "Workflow name must be between 1 and 200 characters.");
  }

  if (!isTriggerType(rule.trigger) || typeof rule.enabled !== "boolean") {
    throw new DataAccessError("VALIDATION", "Workflow trigger or enabled state is invalid.");
  }

  if (rule.description !== undefined && (typeof rule.description !== "string" || rule.description.length > 2000)) {
    throw new DataAccessError("VALIDATION", "Workflow description is too long.");
  }

  return {
    id: typeof rule.id === "string" ? rule.id : "",
    name: rule.name.trim(),
    description: rule.description?.trim() || "",
    enabled: rule.enabled,
    trigger: rule.trigger,
    conditions: validateConditions(rule.conditions),
    actions: validateActions(rule.actions),
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function mapWorkflow(row: WorkflowRow): WorkflowRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    enabled: row.is_active,
    trigger: row.trigger_event as TriggerType,
    conditions: (Array.isArray(row.conditions) ? row.conditions : []) as unknown as TriggerCondition[],
    actions: (Array.isArray(row.actions) ? row.actions : []) as unknown as WorkflowAction[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWorkflowsForWorkspace(): Promise<WorkflowRule[]> {
  const { workspaceId } = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workflows")
    .select(WORKFLOW_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load workflow rules.");
  }

  return ((data || []) as WorkflowRow[]).map(mapWorkflow);
}

export async function saveWorkflowForWorkspace(rule: WorkflowRule): Promise<WorkflowRule> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"]);
  const validated = validateWorkflow(rule);
  const supabase = await createDataClient();
  const persistedId = validated.id && !validated.id.startsWith("rule-") ? validated.id : undefined;

  const { data, error } = await supabase
    .from("workflows")
    .upsert({
      ...(persistedId ? { id: persistedId } : {}),
      workspace_id: workspaceId,
      name: validated.name,
      description: validated.description || null,
      trigger_event: validated.trigger,
      conditions: JSON.parse(JSON.stringify(validated.conditions)),
      actions: JSON.parse(JSON.stringify(validated.actions)),
      is_active: validated.enabled,
      updated_at: new Date().toISOString(),
    })
    .select(WORKFLOW_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to save the workflow rule.");
  }

  return mapWorkflow(data as WorkflowRow);
}

export async function deleteWorkflowForWorkspace(id: string): Promise<void> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (!id.trim() || id.startsWith("rule-")) {
    throw new DataAccessError("VALIDATION", "Persisted workflow ID is required.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to delete the workflow rule.");
  }

  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Workflow rule not found in this workspace.");
  }
}

function mapExecution(
  row: ExecutionRow & { workflows?: { name: string } | null }
): ExecutionLogEntry {
  const logs = isRecord(row.logs) ? row.logs : {};
  return {
    id: row.id,
    ruleId: row.rule_id || "",
    ruleName: row.workflows?.name || "Workflow Rule",
    trigger: row.trigger_event as TriggerType,
    status: row.status as ExecutionStatus,
    executedActions: (Array.isArray(logs.actions) ? logs.actions : []) as ActionType[],
    eventPayload: isRecord(logs.payload) ? logs.payload : {},
    errorMessage: typeof logs.error === "string" ? logs.error : undefined,
    executedAt: row.created_at,
  };
}

export async function listWorkflowExecutionsForWorkspace(): Promise<ExecutionLogEntry[]> {
  const { workspaceId } = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workflow_executions")
    .select(`${EXECUTION_SELECT}, workflows(name)`)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load workflow execution logs.");
  }

  return ((data || []) as unknown as (ExecutionRow & { workflows?: { name: string } | null })[]).map(mapExecution);
}

export async function createWorkflowExecutionForWorkspace(entry: ExecutionLogEntry): Promise<void> {
  const { workspaceId } = await requireWorkspaceContext();
  if (!isTriggerType(entry.trigger) || !EXECUTION_STATUSES.includes(entry.status)) {
    throw new DataAccessError("VALIDATION", "Workflow execution status is invalid.");
  }

  const supabase = await createDataClient();
  let ruleId: string | null = null;
  if (entry.ruleId && !entry.ruleId.startsWith("rule-")) {
    const { data: rule, error: ruleError } = await supabase
      .from("workflows")
      .select("id")
      .eq("id", entry.ruleId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (ruleError) {
      throw new DataAccessError("DATABASE", "Unable to verify the workflow rule.");
    }
    if (!rule) {
      throw new DataAccessError("VALIDATION", "Workflow rule is not in this workspace.");
    }
    ruleId = rule.id;
  }

  const { error } = await supabase.from("workflow_executions").insert({
    workspace_id: workspaceId,
    rule_id: ruleId,
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
    throw new DataAccessError("DATABASE", "Unable to save the workflow execution log.");
  }
}
