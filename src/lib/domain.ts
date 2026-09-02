export type WorkspaceRecordType = "lead" | "product" | "call" | "order" | "custom_object";

export interface WorkspaceRecordRef {
  id: string;
  type: WorkspaceRecordType;
  label?: string;
}

export type WorkspaceRelationshipType = "has_activity" | "belongs_to" | "references" | "related_to";

export interface WorkspaceRelationship {
  id: string;
  type: WorkspaceRelationshipType;
  from: WorkspaceRecordRef;
  to: WorkspaceRecordRef;
}

export type WorkspaceActivityType = "call" | "order" | "sms_paylink" | "note" | "status_change";

export interface WorkspaceActivityMetadata {
  order_id?: string;
  order_value?: number;
  order_currency?: string;
  call_duration_seconds?: number;
  call_outcome?: string;
  paylink_url?: string;
  status_from?: string;
  status_to?: string;
}

export interface WorkspaceActivity {
  id: string;
  record: WorkspaceRecordRef;
  type: WorkspaceActivityType;
  title: string;
  description?: string;
  actor: string;
  timestamp: string;
  source: "supabase";
  metadata?: WorkspaceActivityMetadata;
}
