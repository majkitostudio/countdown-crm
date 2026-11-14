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
  serverDispatch: "supported" | "unavailable";
  unavailableReason?: string;
}

/** Registry of all available triggers with human-readable metadata */
export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  {
    type: "on_call_ended",
    label: "Hovor ukončen",
    description: "Spustí se po ukončení hovoru v konzoli operátora",
    icon: "PhoneOff",
    serverDispatch: "supported",
  },
  {
    type: "on_lead_status_changed",
    label: "Stav leadu změněn",
    description: "Spustí se při změně stavu leadu",
    icon: "ArrowRightLeft",
    serverDispatch: "unavailable",
    unavailableReason: "Změny stavu leadu zatím nejsou napojené na serverové události.",
  },
  {
    type: "on_order_placed",
    label: "Objednávka vytvořena",
    description: "Spustí se po vytvoření nové objednávky",
    icon: "ShoppingCart",
    serverDispatch: "unavailable",
    unavailableReason: "Vytváření objednávek zatím není napojené na serverové události.",
  },
  {
    type: "on_lead_created",
    label: "Lead vytvořen",
    description: "Spustí se po importu nebo ručním vytvoření leadu",
    icon: "UserPlus",
    serverDispatch: "unavailable",
    unavailableReason: "Vytváření leadů zatím není napojené na serverové události.",
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
  /** Whether the workflow server runtime can actually execute this action today. */
  availability: "available" | "coming_soon";
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
    label: "Vytvořit AI shrnutí",
    description: "Nedostupné bez ověřeného poskytovatele AI; nevydává neexistující shrnutí za vytvořené",
    icon: "Sparkles",
    availability: "coming_soon",
  },
  {
    type: "send_email_followup",
    label: "Odeslat navazující e-mail",
    description: "Nedostupné bez ověřeného poskytovatele e-mailu; nepředstírá doručení",
    icon: "Mail",
    availability: "coming_soon",
    configFields: [
      { key: "template", label: "Šablona e-mailu", type: "select", options: [
        { label: "Poděkování po objednávce", value: "thank_you" },
        { label: "Navázání na hovor", value: "followup_call" },
        { label: "Obnovení kontaktu", value: "re_engagement" },
      ]},
    ],
  },
  {
    type: "update_lead_status",
    label: "Změnit stav leadu",
    description: "Nedostupné bez bezpečného serverového zpracování změn",
    icon: "RefreshCw",
    availability: "coming_soon",
    configFields: [
      { key: "target_status", label: "Cílový stav", type: "select", options: [
        { label: "Kontaktován", value: "contacted" },
        { label: "Kvalifikován", value: "qualified" },
        { label: "Zákazník", value: "customer" },
        { label: "Nereaguje", value: "unresponsive" },
      ]},
    ],
  },
  {
    type: "notify_manager",
    label: "Upozornit vedoucího týmu",
    description: "Nedostupné bez ověřeného poskytovatele upozornění pro vedoucí",
    icon: "Bell",
    availability: "coming_soon",
    configFields: [
      { key: "message", label: "Text upozornění", type: "text", placeholder: "Např. {{lead_name}} vytvořil objednávku s vysokou hodnotou" },
    ],
  },
  {
    type: "send_webhook",
    label: "HTTP Webhook (Zapier/Make)",
    description: "Odešle data události v reálném čase na externí webhook (Zapier, Make, n8n, Slack)",
    icon: "Globe",
    availability: "available",
    configFields: [
      { key: "webhook_url", label: "URL webhooku", type: "text", placeholder: "https://hooks.zapier.com/hooks/catch/..." },
      { key: "method", label: "Metoda HTTP", type: "select", options: [
        { label: "POST (data JSON)", value: "POST" },
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

export type ActionExecutionStatus = "success" | "failure" | "simulation" | "unavailable";

export type ExecutionStatus = ActionExecutionStatus | "skipped";

export interface WorkflowActionResult {
  action: ActionType;
  status: ActionExecutionStatus;
  reason: string;
  /** True only when the action caused a durable external or database effect. */
  durableEffect: boolean;
}

export interface ExecutionLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: TriggerType;
  status: ExecutionStatus;
  /** The actions that completed with a real durable effect. */
  executedActions: ActionType[];
  /** Truthful outcome for every configured action, including simulation/unavailable. */
  actionResults: WorkflowActionResult[];
  /** Context data that was passed to the engine */
  eventPayload: Record<string, unknown>;
  /** Stable source-business identifier used to suppress duplicate event delivery. */
  eventId?: string;
  /** Whether at least one action produced a durable effect. */
  durableEffect: boolean;
  /** Whether this execution log was durably written. */
  persistenceStatus: "persisted" | "failed";
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
  scheduledAt?: string | null;
  failReason?: string | null;
  operatorNote?: string;
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

export interface WorkflowDispatchResult {
  trigger: TriggerType;
  eventId: string;
  status: ExecutionStatus;
  reason: string;
  durableEffect: boolean;
  entries: ExecutionLogEntry[];
}
