export type AttributeType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "boolean"
  | "ai_generated"
  | "relation";

export interface SelectOption {
  label: string;
  value: string;
  color?: string;
}

export interface AiPromptConfig {
  promptTemplate: string;
  contextSources: ("transcript" | "lead_notes" | "company_info" | "purchase_history")[];
  model?: string;
  refreshTrigger?: "on_call_end" | "on_record_update" | "on_demand";
}

export interface AttributeDefinition {
  id: string;
  key: string;
  name: string;
  type: AttributeType;
  description?: string;
  required?: boolean;
  options?: SelectOption[];
  aiConfig?: AiPromptConfig;
  defaultValue?: unknown;
}

export interface ObjectSchema {
  id: string;
  slug: string; // e.g. "leads", "products", "calls", "deals"
  name: string;
  description: string;
  iconName: string;
  attributes: AttributeDefinition[];
}

export interface RecordEntity {
  id: string;
  schemaSlug: string;
  values: Record<string, unknown>; // Map attribute key -> value
  createdAt: string;
  updatedAt: string;
}
