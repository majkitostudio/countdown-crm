/**
 * Workflow Engine — Runtime Core & Storage Persistence
 *
 * Singleton engine that:
 * 1. Manages workflow rules (CRUD)
 * 2. Evaluates trigger conditions
 * 3. Evaluates explicit test-only simulations of workflow actions
 * 4. Maintains a local view of simulation results; production dispatch is server-owned
 *
 * Designed to be imported across the app and called via:
 *   workflowEngine.emit("on_call_ended", payload)
 */

import {
  WorkflowRule,
  TriggerType,
  ExecutionLogEntry,
} from "./types";
import {
  createWorkflowExecutionAction,
  deleteWorkflowAction,
  saveWorkflowAction,
} from "@/app/actions/workflows";
import { evaluateWorkflowEvent } from "./evaluator";

// ─── Engine Class ───────────────────────────────────────────────────────────

class WorkflowEngine {
  private rules: WorkflowRule[] = [];
  private executionLog: ExecutionLogEntry[] = [];

  constructor() {
    // Production truth is loaded by the workflows page from Supabase. The
    // runtime engine starts empty until the authenticated workspace rules are
    // explicitly supplied by the application.
    this.rules = [];
  }

  // ── Rule CRUD ──────────────────────────────────────────────────────────

  public getRules(): WorkflowRule[] {
    return [...this.rules];
  }

  /** Load the active workspace snapshot supplied by the Supabase data path. */
  public replaceRules(rules: WorkflowRule[]): void {
    this.rules = rules.map((rule) => ({ ...rule }));
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
    saveWorkflowAction(newRule).catch((err) =>
      console.warn("[WorkflowEngine] Failed to sync new rule to Supabase:", err)
    );
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
    saveWorkflowAction(this.rules[index]).catch((err) =>
      console.warn("[WorkflowEngine] Failed to sync updated rule to Supabase:", err)
    );
    return this.rules[index];
  }

  public deleteRule(id: string): boolean {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== id);
    const deleted = this.rules.length < before;
    if (deleted) {
      deleteWorkflowAction(id).catch((err) =>
        console.warn("[WorkflowEngine] Failed to delete rule from Supabase:", err)
      );
    }
    return deleted;
  }

  public toggleRule(id: string): boolean {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) return false;
    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    saveWorkflowAction(rule).catch((err) =>
      console.warn("[WorkflowEngine] Failed to sync toggled rule to Supabase:", err)
    );
    return true;
  }

  // ── Event Emission & Evaluation ────────────────────────────────────────

  /**
   * Emit a test-only simulation. Production events must use the server-owned
   * dispatcher so the browser cannot claim that a call was completed or that
   * an automation was durable.
   */
  public async emit(
    trigger: TriggerType,
    payload: Record<string, unknown>
  ): Promise<ExecutionLogEntry[]> {
    const result = await evaluateWorkflowEvent(
      this.rules,
      trigger,
      payload,
      {
        mode: "simulation",
        eventId: typeof payload.eventId === "string" ? payload.eventId : `simulation-${Date.now()}`,
        persist: (entry) => createWorkflowExecutionAction(entry),
      },
    );
    this.executionLog.push(...result.entries);
    return result.entries;
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

}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const workflowEngine = new WorkflowEngine();
