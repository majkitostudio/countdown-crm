import type {
  ExecutionLogEntry,
  ExecutionStatus,
  TriggerCondition,
  TriggerType,
  WorkflowAction,
  WorkflowActionResult,
  WorkflowDispatchResult,
  WorkflowRule,
} from "./types";

export type WorkflowExecutionMode = "server" | "simulation";

export interface WorkflowEvaluationOptions {
  mode: WorkflowExecutionMode;
  eventId: string;
  persist: (entry: ExecutionLogEntry) => Promise<void>;
  findExisting?: (rule: WorkflowRule, eventId: string) => Promise<ExecutionLogEntry | null>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown workflow execution error";
}

function executionId(): string {
  return globalThis.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
}

export function evaluateWorkflowConditions(
  conditions: TriggerCondition[],
  payload: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((condition) => {
    const fieldValue = String(payload[condition.field] ?? "");
    const conditionValue = condition.value;

    switch (condition.operator) {
      case "equals":
        return fieldValue === conditionValue;
      case "not_equals":
        return fieldValue !== conditionValue;
      case "contains":
        return fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
      case "greater_than":
        return parseFloat(fieldValue) > parseFloat(conditionValue);
      case "less_than":
        return parseFloat(fieldValue) < parseFloat(conditionValue);
      default:
        return false;
    }
  });
}

function interpolateTemplate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(payload[key] ?? key));
}

function unavailable(action: WorkflowAction, reason: string): WorkflowActionResult {
  return { action: action.type, status: "unavailable", reason, durableEffect: false };
}

async function executeAction(
  action: WorkflowAction,
  payload: Record<string, unknown>,
  mode: WorkflowExecutionMode,
): Promise<WorkflowActionResult> {
  if (action.type === "send_webhook") {
    const targetUrl = action.config.webhook_url?.trim();
    if (!targetUrl) {
      return {
        action: action.type,
        status: "failure",
        reason: "Webhook URL is missing.",
        durableEffect: false,
      };
    }

    const method = action.config.method || "POST";
    if (method !== "GET" && method !== "POST") {
      return {
        action: action.type,
        status: "failure",
        reason: `Unsupported webhook method: ${method}.`,
        durableEffect: false,
      };
    }

    if (mode === "simulation") {
      return {
        action: action.type,
        status: "simulation",
        reason: "Test-only simulation; no webhook request was sent.",
        durableEffect: false,
      };
    }

    try {
      const response = await fetch(targetUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        return {
          action: action.type,
          status: "failure",
          reason: `Webhook returned HTTP ${response.status}.`,
          durableEffect: false,
        };
      }

      return {
        action: action.type,
        status: "success",
        reason: `Webhook accepted the request with HTTP ${response.status}.`,
        durableEffect: true,
      };
    } catch (error) {
      return {
        action: action.type,
        status: "failure",
        reason: `Webhook request failed: ${errorMessage(error)}.`,
        durableEffect: false,
      };
    }
  }

  if (mode === "simulation") {
    return {
      action: action.type,
      status: "simulation",
      reason: "Test-only simulation; no provider or database mutation was used.",
      durableEffect: false,
    };
  }

  switch (action.type) {
    case "compute_ai_summary":
      return unavailable(action, "AI summary provider is not configured.");
    case "send_email_followup":
      return unavailable(action, "Email provider is not configured.");
    case "update_lead_status":
      return unavailable(action, "Workflow lead-status mutation has no enabled server provider.");
    case "notify_manager":
      return unavailable(
        action,
        `Manager notification provider is not configured${action.config.message ? ` (message: ${interpolateTemplate(action.config.message, payload)})` : "."}`,
      );
    default:
      return unavailable(action, "This workflow action is not available on the server.");
  }
}

function aggregateStatus(results: WorkflowActionResult[]): ExecutionStatus {
  if (results.length === 0) return "skipped";
  if (results.some((result) => result.status === "failure")) return "failure";
  if (results.some((result) => result.status === "unavailable")) return "unavailable";
  if (results.some((result) => result.status === "simulation")) return "simulation";
  return "success";
}

function aggregateReason(results: WorkflowActionResult[]): string {
  return results.map((result) => `${result.action}: ${result.reason}`).join(" ");
}

function createEntry(
  rule: WorkflowRule,
  trigger: TriggerType,
  payload: Record<string, unknown>,
  eventId: string,
  status: ExecutionStatus,
  actionResults: WorkflowActionResult[],
  reason?: string,
): ExecutionLogEntry {
  return {
    id: executionId(),
    ruleId: rule.id,
    ruleName: rule.name,
    trigger,
    status,
    executedActions: actionResults
      .filter((result) => result.status === "success" && result.durableEffect)
      .map((result) => result.action),
    actionResults,
    eventPayload: payload,
    eventId,
    durableEffect: actionResults.some((result) => result.durableEffect),
    persistenceStatus: "failed",
    errorMessage: reason,
    executedAt: new Date().toISOString(),
  };
}

async function persistEntry(
  entry: ExecutionLogEntry,
  persist: WorkflowEvaluationOptions["persist"],
): Promise<ExecutionLogEntry> {
  try {
    await persist(entry);
    return { ...entry, persistenceStatus: "persisted" };
  } catch (error) {
    return {
      ...entry,
      status: "failure",
      persistenceStatus: "failed",
      errorMessage: `Execution log persistence failed: ${errorMessage(error)}.`,
    };
  }
}

export async function evaluateWorkflowEvent(
  rules: WorkflowRule[],
  trigger: TriggerType,
  payload: Record<string, unknown>,
  options: WorkflowEvaluationOptions,
): Promise<WorkflowDispatchResult> {
  const entries: ExecutionLogEntry[] = [];
  const matchingRules = rules.filter((rule) => rule.enabled && rule.trigger === trigger);

  for (const rule of matchingRules) {
    const existing = options.findExisting ? await options.findExisting(rule, options.eventId) : null;
    if (existing) {
      entries.push(existing);
      continue;
    }

    if (!evaluateWorkflowConditions(rule.conditions, payload)) {
      entries.push(await persistEntry(
        createEntry(rule, trigger, payload, options.eventId, "skipped", [], "Trigger conditions were not met."),
        options.persist,
      ));
      continue;
    }

    const actionResults: WorkflowActionResult[] = [];
    for (const action of rule.actions) {
      actionResults.push(await executeAction(action, payload, options.mode));
    }

    entries.push(await persistEntry(
      createEntry(rule, trigger, payload, options.eventId, aggregateStatus(actionResults), actionResults, aggregateReason(actionResults)),
      options.persist,
    ));
  }

  const nonSkippedEntries = entries.filter((entry) => entry.status !== "skipped");
  const status: ExecutionStatus = matchingRules.length === 0
    ? "skipped"
    : nonSkippedEntries.some((entry) => entry.status === "failure")
    ? "failure"
    : nonSkippedEntries.some((entry) => entry.status === "unavailable")
    ? "unavailable"
    : nonSkippedEntries.some((entry) => entry.status === "simulation")
    ? "simulation"
    : nonSkippedEntries.length === 0 && entries.length > 0
    ? "skipped"
    : "success";

  return {
    trigger,
    eventId: options.eventId,
    status,
    reason: matchingRules.length === 0
      ? "No active workflow rules matched this event."
      : entries.map((entry) => entry.errorMessage).filter(Boolean).join(" ") || "Workflow event evaluated.",
    durableEffect: entries.some((entry) => entry.durableEffect),
    entries,
  };
}
