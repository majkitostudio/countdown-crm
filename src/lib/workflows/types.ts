/**
 * Workflow Engine — Type Definitions
 *
 * Defines the type system for the Agentic Workflow Engine:
 * Triggers (events), Actions (side-effects), Rules (trigger→action chains),
 * and ExecutionLog entries (audit trail).
 */

// ─── Trigger Types ──────────────────────────────────────────────────────────

export type TriggerType =
  | "on_call_ended"
  | "on_lead_status_changed"
  | "on_order_placed"
  | "on_lead_created";

export interface TriggerDefinition {
  type: TriggerType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
}

/** Registry of all available triggers with human-readable metadata */
export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  {
    type: "on_call_ended",
    label: "Call Ended",
    description: "Fires when an operator finishes a call in the Operator Console",
    icon: "PhoneOff",
  },
  {
    type: "on_lead_status_changed",
    label: "Lead Status Changed",
    description: "Fires when a lead moves to a different pipeline stage",
    icon: "ArrowRightLeft",
  },
  {
    type: "on_order_placed",
    label: "Order Placed",
    description: "Fires when a new order is successfully created",
    icon: "ShoppingCart",
  },
  {
    type: "on_lead_created",
    label: "Lead Created",
    description: "Fires when a new lead is imported or manually created",
    icon: "UserPlus",
  },
];

// ─── Condition (Optional Filter) ────────────────────────────────────────────

export interface TriggerCondition {
  field: string; // e.g. "outcome", "status", "order_value"
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string;
}

// ─── Action Types ───────────────────────────────────────────────────────────

export type ActionType =
  | "compute_ai_summary"
  | "send_email_followup"
  | "update_lead_status"
  | "notify_manager"
  | "send_webhook";

export interface ActionDefinition {
  type: ActionType;
  label: string;
  description: string;
  icon: string;
  /** Parameter keys this action expects (for config UI) */
  configFields?: ActionConfigField[];
}

export interface ActionConfigField {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

/** Registry of all available actions with human-readable metadata */
export const ACTION_REGISTRY: ActionDefinition[] = [
  {
    type: "compute_ai_summary",
    label: "Generate AI Summary",
    description: "Uses Gemini 2.5 Flash to generate a summary of the call transcript or lead context",
    icon: "Sparkles",
  },
  {
    type: "send_email_followup",
    label: "Send Follow-up Email",
    description: "Sends an automated follow-up email to the lead",
    icon: "Mail",
    configFields: [
      { key: "template", label: "Email Template", type: "select", options: [
        { label: "Thank You (Post-Order)", value: "thank_you" },
        { label: "Follow-Up (After Call)", value: "followup_call" },
        { label: "Re-Engagement (Cold Lead)", value: "re_engagement" },
      ]},
    ],
  },
  {
    type: "update_lead_status",
    label: "Update Lead Status",
    description: "Automatically moves the lead to a specified pipeline stage",
    icon: "RefreshCw",
    configFields: [
      { key: "target_status", label: "Target Status", type: "select", options: [
        { label: "Contacted", value: "contacted" },
        { label: "Qualified", value: "qualified" },
        { label: "Customer", value: "customer" },
        { label: "Unresponsive", value: "unresponsive" },
      ]},
    ],
  },
  {
    type: "notify_manager",
    label: "Notify Manager",
    description: "Sends a notification to the team manager about this event",
    icon: "Bell",
    configFields: [
      { key: "message", label: "Notification Message", type: "text", placeholder: "E.g. High-value order placed by {{lead_name}}" },
    ],
  },
  {
    type: "send_webhook",
    label: "HTTP Webhook (Zapier/Make)",
    description: "Sends real-time event payload to an external Webhook URL (Zapier, Make, n8n, Slack)",
    icon: "Globe",
    configFields: [
      { key: "webhook_url", label: "Webhook Endpoint URL", type: "text", placeholder: "https://hooks.zapier.com/hooks/catch/..." },
      { key: "method", label: "HTTP Method", type: "select", options: [
        { label: "POST (JSON Payload)", value: "POST" },
        { label: "GET", value: "GET" },
      ]},
    ],
  },
];

// ─── Workflow Rule ───────────────────────────────────────────────────────────

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, string>;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: TriggerType;
  conditions: TriggerCondition[];
  actions: WorkflowAction[];
  createdAt: string;
  updatedAt: string;
}

// ─── Execution Log ──────────────────────────────────────────────────────────

export type ExecutionStatus = "success" | "failure" | "skipped";

export interface ExecutionLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: TriggerType;
  status: ExecutionStatus;
  /** The actions that were executed */
  executedActions: ActionType[];
  /** Context data that was passed to the engine */
  eventPayload: Record<string, unknown>;
  /** Any error messages if status is "failure" */
  errorMessage?: string;
  /** Timestamp of execution */
  executedAt: string;
}

// ─── Event Payload Types ────────────────────────────────────────────────────

export interface CallEndedPayload {
  callId: string;
  leadId: string;
  leadName: string;
  agentName: string;
  outcome: string;
  sentiment: string;
  orderValue: number;
  transcript: string;
}

export interface LeadStatusChangedPayload {
  leadId: string;
  leadName: string;
  previousStatus: string;
  newStatus: string;
}

export interface OrderPlacedPayload {
  orderId: string;
  leadId: string;
  leadName: string;
  orderValue: number;
  productTitle: string;
}

export interface LeadCreatedPayload {
  leadId: string;
  leadName: string;
  source: string;
}

export type WorkflowEventPayload =
  | CallEndedPayload
  | LeadStatusChangedPayload
  | OrderPlacedPayload
  | LeadCreatedPayload;
