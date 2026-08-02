/**
 * Workflow Engine — Runtime Core
 *
 * Singleton engine that:
 * 1. Manages workflow rules (CRUD)
 * 2. Evaluates trigger conditions
 * 3. Executes actions (AI summary, status update, notifications)
 * 4. Maintains an in-memory audit log (ExecutionLog)
 *
 * Designed to be imported across the app and called via:
 *   workflowEngine.emit("on_call_ended", payload)
 */

import {
  WorkflowRule,
  TriggerType,
  TriggerCondition,
  WorkflowAction,
  ExecutionLogEntry,
  ExecutionStatus,
  WorkflowEventPayload,
} from "./types";

// ─── Default Demo Rules ─────────────────────────────────────────────────────

const DEFAULT_RULES: WorkflowRule[] = [
  {
    id: "rule-1",
    name: "AI Summary po úspěšném hovoru",
    description: "Po ukončení hovoru s výsledkem 'order_placed' se vygeneruje AI shrnutí.",
    enabled: true,
    trigger: "on_call_ended",
    conditions: [
      { field: "outcome", operator: "equals", value: "order_placed" },
    ],
    actions: [
      { type: "compute_ai_summary", config: {} },
      { type: "update_lead_status", config: { target_status: "customer" } },
    ],
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "rule-2",
    name: "Notifikace manažera u objednávky nad 1 000 Kč",
    description: "Při vytvoření objednávky nad 1 000 Kč se odešle upozornění.",
    enabled: true,
    trigger: "on_order_placed",
    conditions: [
      { field: "orderValue", operator: "greater_than", value: "1000" },
    ],
    actions: [
      { type: "notify_manager", config: { message: "Velká objednávka od {{lead_name}} za {{order_value}} Kč" } },
    ],
    createdAt: "2026-08-01T10:05:00Z",
    updatedAt: "2026-08-01T10:05:00Z",
  },
  {
    id: "rule-3",
    name: "Follow-up email novým leadům",
    description: "Automatický uvítací e-mail při vytvoření nového leadu.",
    enabled: false,
    trigger: "on_lead_created",
    conditions: [],
    actions: [
      { type: "send_email_followup", config: { template: "re_engagement" } },
    ],
    createdAt: "2026-08-01T10:10:00Z",
    updatedAt: "2026-08-01T10:10:00Z",
  },
];

// ─── Engine Class ───────────────────────────────────────────────────────────

class WorkflowEngine {
  private rules: WorkflowRule[] = [];
  private executionLog: ExecutionLogEntry[] = [];

  constructor() {
    this.rules = [...DEFAULT_RULES];
  }

  // ── Rule CRUD ──────────────────────────────────────────────────────────

  public getRules(): WorkflowRule[] {
    return [...this.rules];
  }

  public getRuleById(id: string): WorkflowRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  public addRule(rule: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">): WorkflowRule {
    const now = new Date().toISOString();
    const newRule: WorkflowRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.rules.push(newRule);
    return newRule;
  }

  public updateRule(id: string, updates: Partial<WorkflowRule>): WorkflowRule | null {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index === -1) return null;

    this.rules[index] = {
      ...this.rules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.rules[index];
  }

  public deleteRule(id: string): boolean {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== id);
    return this.rules.length < before;
  }

  public toggleRule(id: string): boolean {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) return false;
    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    return true;
  }

  // ── Event Emission & Evaluation ────────────────────────────────────────

  /**
   * Emit a trigger event. All matching & enabled rules are evaluated and their actions executed.
   */
  public async emit(
    trigger: TriggerType,
    payload: Record<string, unknown>
  ): Promise<ExecutionLogEntry[]> {
    const matchingRules = this.rules.filter(
      (r) => r.enabled && r.trigger === trigger
    );

    const results: ExecutionLogEntry[] = [];

    for (const rule of matchingRules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, payload);

      if (!conditionsMet) {
        const skippedEntry = this.createLogEntry(rule, trigger, "skipped", [], payload);
        results.push(skippedEntry);
        continue;
      }

      try {
        const executedActions = await this.executeActions(rule.actions, payload);
        const successEntry = this.createLogEntry(rule, trigger, "success", executedActions, payload);
        results.push(successEntry);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown execution error";
        const failEntry = this.createLogEntry(rule, trigger, "failure", [], payload, errorMessage);
        results.push(failEntry);
      }
    }

    return results;
  }

  // ── Condition Evaluation ───────────────────────────────────────────────

  private evaluateConditions(
    conditions: TriggerCondition[],
    payload: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true; // No conditions = always match

    return conditions.every((cond) => {
      const fieldValue = String(payload[cond.field] ?? "");
      const condValue = cond.value;

      switch (cond.operator) {
        case "equals":
          return fieldValue === condValue;
        case "not_equals":
          return fieldValue !== condValue;
        case "contains":
          return fieldValue.toLowerCase().includes(condValue.toLowerCase());
        case "greater_than":
          return parseFloat(fieldValue) > parseFloat(condValue);
        case "less_than":
          return parseFloat(fieldValue) < parseFloat(condValue);
        default:
          return false;
      }
    });
  }

  // ── Action Execution ───────────────────────────────────────────────────

  private async executeActions(
    actions: WorkflowAction[],
    payload: Record<string, unknown>
  ): Promise<string[]> {
    const executed: string[] = [];

    for (const action of actions) {
      switch (action.type) {
        case "compute_ai_summary":
          console.log(
            `[WorkflowEngine] 🤖 AI Summary requested for lead: ${payload.leadName || payload.leadId}`
          );
          // In production, this would call analyzeTranscriptWithGemini()
          executed.push("compute_ai_summary");
          break;

        case "send_email_followup":
          console.log(
            `[WorkflowEngine] 📧 Email follow-up (template: ${action.config.template}) for: ${payload.leadName || payload.leadId}`
          );
          executed.push("send_email_followup");
          break;

        case "update_lead_status":
          console.log(
            `[WorkflowEngine] 🏷️ Lead status → ${action.config.target_status} for: ${payload.leadName || payload.leadId}`
          );
          // In production, this would call updateLead()
          executed.push("update_lead_status");
          break;

        case "notify_manager":
          const message = this.interpolateTemplate(
            action.config.message || "Workflow notification",
            payload
          );
          console.log(`[WorkflowEngine] 🔔 Manager notification: ${message}`);
          executed.push("notify_manager");
          break;

        default:
          console.warn(`[WorkflowEngine] Unknown action type: ${action.type}`);
      }
    }

    return executed;
  }

  // ── Audit Log ──────────────────────────────────────────────────────────

  public getExecutionLog(): ExecutionLogEntry[] {
    return [...this.executionLog].sort(
      (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
  }

  public clearExecutionLog(): void {
    this.executionLog = [];
  }

  private createLogEntry(
    rule: WorkflowRule,
    trigger: TriggerType,
    status: ExecutionStatus,
    executedActions: string[],
    payload: Record<string, unknown>,
    errorMessage?: string
  ): ExecutionLogEntry {
    const entry: ExecutionLogEntry = {
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger,
      status,
      executedActions: executedActions as ExecutionLogEntry["executedActions"],
      eventPayload: payload,
      errorMessage,
      executedAt: new Date().toISOString(),
    };

    this.executionLog.push(entry);
    return entry;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Simple template interpolation: replaces {{key}} with payload values
   */
  private interpolateTemplate(
    template: string,
    payload: Record<string, unknown>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(payload[key] ?? key);
    });
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const workflowEngine = new WorkflowEngine();
