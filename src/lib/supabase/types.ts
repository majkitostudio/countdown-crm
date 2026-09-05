export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: "administrator" | "team_leader" | "operator";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: "administrator" | "team_leader" | "operator";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: "administrator" | "team_leader" | "operator";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      workspace_telephony_settings: {
        Row: {
          workspace_id: string;
          active_adapter: "simulation" | "local_sip" | "telnyx";
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          active_adapter?: "simulation" | "local_sip" | "telnyx";
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          active_adapter?: "simulation" | "local_sip" | "telnyx";
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: "administrator" | "team_leader" | "operator";
          status: "ready" | "in_call" | "break";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: "administrator" | "team_leader" | "operator";
          status?: "ready" | "in_call" | "break";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: "administrator" | "team_leader" | "operator";
          status?: "ready" | "in_call" | "break";
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          workspace_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          city: string | null;
          company: string | null;
          country: string;
          status: "new" | "contacted" | "qualified" | "customer" | "unresponsive";
          ai_score: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          full_name: string;
          phone: string;
          email?: string | null;
          city?: string | null;
          company?: string | null;
          country?: string;
          status?: "new" | "contacted" | "qualified" | "customer" | "unresponsive";
          ai_score?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
          email?: string | null;
          city?: string | null;
          company?: string | null;
          country?: string;
          status?: "new" | "contacted" | "qualified" | "customer" | "unresponsive";
          ai_score?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      operator_presence: {
        Row: {
          workspace_id: string;
          operator_id: string;
          state: "offline" | "available" | "break" | "in_call" | "after_call";
          last_heartbeat_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          operator_id: string;
          state?: "offline" | "available" | "break" | "in_call" | "after_call";
          last_heartbeat_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: "offline" | "available" | "break" | "in_call" | "after_call";
          last_heartbeat_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_queue_items: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          assigned_operator_id: string | null;
          preferred_operator_id: string | null;
          state: "available" | "assigned" | "in_progress" | "awaiting_outcome" | "waiting_callback" | "closed" | "paused";
          priority: number;
          available_at: string;
          scheduled_at: string | null;
          attempt_count: number;
          claimed_at: string | null;
          last_heartbeat_at: string | null;
          lease_expires_at: string | null;
          last_outcome: string | null;
          released_at: string | null;
          completed_at: string | null;
          call_started_at: string | null;
          call_ended_at: string | null;
          recovery_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          assigned_operator_id?: string | null;
          preferred_operator_id?: string | null;
          state?: "available" | "assigned" | "in_progress" | "awaiting_outcome" | "waiting_callback" | "closed" | "paused";
          priority?: number;
          available_at?: string;
          scheduled_at?: string | null;
          attempt_count?: number;
          claimed_at?: string | null;
          last_heartbeat_at?: string | null;
          lease_expires_at?: string | null;
          last_outcome?: string | null;
          released_at?: string | null;
          completed_at?: string | null;
          call_started_at?: string | null;
          call_ended_at?: string | null;
          recovery_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assigned_operator_id?: string | null;
          preferred_operator_id?: string | null;
          state?: "available" | "assigned" | "in_progress" | "awaiting_outcome" | "waiting_callback" | "closed" | "paused";
          priority?: number;
          available_at?: string;
          scheduled_at?: string | null;
          attempt_count?: number;
          claimed_at?: string | null;
          last_heartbeat_at?: string | null;
          lease_expires_at?: string | null;
          last_outcome?: string | null;
          released_at?: string | null;
          completed_at?: string | null;
          call_started_at?: string | null;
          call_ended_at?: string | null;
          recovery_required?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_queue_events: {
        Row: {
          id: string;
          workspace_id: string;
          queue_item_id: string;
          lead_id: string;
          event_type: "created" | "claimed" | "started" | "heartbeat" | "completed" | "released" | "reassigned" | "callback_scheduled" | "requeued" | "lease_expired" | "interrupted" | "outcome_pending" | "reopened" | "paused";
          from_state: string | null;
          to_state: string;
          from_operator_id: string | null;
          to_operator_id: string | null;
          actor_id: string | null;
          reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          queue_item_id: string;
          lead_id: string;
          event_type: "created" | "claimed" | "started" | "heartbeat" | "completed" | "released" | "reassigned" | "callback_scheduled" | "requeued" | "lease_expired" | "interrupted" | "outcome_pending" | "reopened" | "paused";
          from_state?: string | null;
          to_state: string;
          from_operator_id?: string | null;
          to_operator_id?: string | null;
          actor_id?: string | null;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          reason?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      lead_notes: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      operator_reminders: {
        Row: {
          id: string;
          workspace_id: string;
          owner_id: string;
          lead_id: string | null;
          title: string;
          note: string | null;
          due_at: string;
          remind_at: string;
          status: "open" | "completed" | "cancelled";
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          owner_id: string;
          lead_id?: string | null;
          title: string;
          note?: string | null;
          due_at: string;
          remind_at: string;
          status?: "open" | "completed" | "cancelled";
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          lead_id?: string | null;
          title?: string;
          note?: string | null;
          due_at?: string;
          remind_at?: string;
          status?: "open" | "completed" | "cancelled";
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operator_reminders_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operator_reminders_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operator_reminders_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          id: string;
          workspace_id: string | null;
          title: string;
          category: "supplements" | "cosmetics" | "electronics";
          price: number;
          currency: string;
          description: string | null;
          image_url: string | null;
          in_stock: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          title: string;
          category: "supplements" | "cosmetics" | "electronics";
          price: number;
          currency?: string;
          description?: string | null;
          image_url?: string | null;
          in_stock?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          category?: "supplements" | "cosmetics" | "electronics";
          price?: number;
          currency?: string;
          description?: string | null;
          image_url?: string | null;
          in_stock?: boolean;
        };
        Relationships: [];
      };
      product_scripts: {
        Row: {
          id: string;
          workspace_id: string;
          product_id: string;
          content_html: string;
          updated_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          product_id: string;
          content_html: string;
          updated_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_id?: string;
          content_html?: string;
          updated_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_scripts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_scripts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_scripts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      product_script_versions: {
        Row: {
          id: string;
          workspace_id: string;
          product_id: string;
          version_number: number;
          status: "draft" | "published" | "archived";
          content_html: string;
          created_by: string;
          published_by: string | null;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          product_id: string;
          version_number: number;
          status?: "draft" | "published" | "archived";
          content_html: string;
          created_by: string;
          published_by?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          version_number?: number;
          status?: "draft" | "published" | "archived";
          content_html?: string;
          published_by?: string | null;
          published_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_script_versions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_script_versions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_script_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_script_versions_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      calls: {
        Row: {
          id: string;
          workspace_id: string | null;
          lead_id: string | null;
          agent_id: string | null;
          duration_seconds: number;
          outcome: "order_placed" | "followup_scheduled" | "objection" | "no_answer" | "completed";
          fail_reason: "price" | "distrust" | "alternative_solution" | "health_concern" | "no_interest" | "needs_time" | "other" | null;
          operator_note: string | null;
          transcript: string | null;
          ai_sentiment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          lead_id?: string | null;
          agent_id?: string | null;
          duration_seconds?: number;
          outcome?: "order_placed" | "followup_scheduled" | "objection" | "no_answer" | "completed";
          fail_reason?: "price" | "distrust" | "alternative_solution" | "health_concern" | "no_interest" | "needs_time" | "other" | null;
          operator_note?: string | null;
          transcript?: string | null;
          ai_sentiment?: string | null;
          created_at?: string;
        };
        Update: {
          lead_id?: string | null;
          agent_id?: string | null;
          duration_seconds?: number;
          outcome?: "order_placed" | "followup_scheduled" | "objection" | "no_answer" | "completed";
          fail_reason?: "price" | "distrust" | "alternative_solution" | "health_concern" | "no_interest" | "needs_time" | "other" | null;
          operator_note?: string | null;
          transcript?: string | null;
          ai_sentiment?: string | null;
        };
        Relationships: [];
      };
      telephony_credentials: {
        Row: {
          id: string;
          workspace_id: string;
          operator_id: string;
          provider: "telnyx";
          provider_credential_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          operator_id: string;
          provider?: "telnyx";
          provider_credential_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider?: "telnyx";
          provider_credential_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      telephony_call_sessions: {
        Row: {
          id: string;
          workspace_id: string;
          queue_item_id: string | null;
          lead_id: string | null;
          operator_id: string | null;
          provider: "telnyx" | "local_sip";
          provider_call_id: string | null;
          direction: "inbound" | "outbound";
          telnyx_call_control_id: string | null;
          telnyx_call_leg_id: string | null;
          telnyx_call_session_id: string | null;
          telnyx_connection_id: string | null;
          from_number: string | null;
          to_number: string | null;
          status: "initiated" | "ringing" | "connected" | "held" | "ended" | "failed";
          started_at: string | null;
          answered_at: string | null;
          ended_at: string | null;
          duration_seconds: number;
          recording_id: string | null;
          recording_url: string | null;
          hangup_cause: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          queue_item_id?: string | null;
          lead_id?: string | null;
          operator_id?: string | null;
          provider?: "telnyx" | "local_sip";
          provider_call_id?: string | null;
          direction: "inbound" | "outbound";
          telnyx_call_control_id?: string | null;
          telnyx_call_leg_id?: string | null;
          telnyx_call_session_id?: string | null;
          telnyx_connection_id?: string | null;
          from_number?: string | null;
          to_number?: string | null;
          status?: "initiated" | "ringing" | "connected" | "held" | "ended" | "failed";
          started_at?: string | null;
          answered_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number;
          recording_id?: string | null;
          recording_url?: string | null;
          hangup_cause?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_call_id?: string | null;
          queue_item_id?: string | null;
          lead_id?: string | null;
          operator_id?: string | null;
          telnyx_call_control_id?: string | null;
          telnyx_call_leg_id?: string | null;
          telnyx_call_session_id?: string | null;
          telnyx_connection_id?: string | null;
          from_number?: string | null;
          to_number?: string | null;
          status?: "initiated" | "ringing" | "connected" | "held" | "ended" | "failed";
          started_at?: string | null;
          answered_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number;
          recording_id?: string | null;
          recording_url?: string | null;
          hangup_cause?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      telephony_call_events: {
        Row: {
          id: string;
          workspace_id: string;
          call_session_id: string | null;
          provider: "telnyx" | "local_sip";
          provider_event_id: string;
          event_type: string;
          provider_call_control_id: string | null;
          provider_call_leg_id: string | null;
          provider_call_session_id: string | null;
          payload: Json;
          occurred_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          call_session_id?: string | null;
          provider?: "telnyx" | "local_sip";
          provider_event_id: string;
          event_type: string;
          provider_call_control_id?: string | null;
          provider_call_leg_id?: string | null;
          provider_call_session_id?: string | null;
          payload?: Json;
          occurred_at?: string | null;
          created_at?: string;
        };
        Update: {
          payload?: Json;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          workspace_id: string | null;
          lead_id: string | null;
          product_id: string | null;
          agent_id: string | null;
          total_amount: number;
          currency: string;
          status: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
          order_source: "previous_call" | "email" | "web_form" | "manual" | "other";
          source_note: string | null;
          revision: number;
          delivered_at: string | null;
          returned_at: string | null;
          fulfillment_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          lead_id?: string | null;
          product_id?: string | null;
          agent_id?: string | null;
          total_amount: number;
          currency?: string;
          status?: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
          order_source?: "previous_call" | "email" | "web_form" | "manual" | "other";
          source_note?: string | null;
          revision?: number;
          delivered_at?: string | null;
          returned_at?: string | null;
          fulfillment_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          lead_id?: string | null;
          product_id?: string | null;
          agent_id?: string | null;
          total_amount?: number;
          currency?: string;
          status?: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
          order_source?: "previous_call" | "email" | "web_form" | "manual" | "other";
          source_note?: string | null;
          revision?: number;
          delivered_at?: string | null;
          returned_at?: string | null;
          fulfillment_event_id?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          workspace_id: string;
          order_id: string;
          product_id: string;
          product_title_snapshot: string;
          unit_price: number;
          minimum_unit_price: number;
          quantity: number;
          line_total: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          order_id: string;
          product_id: string;
          product_title_snapshot: string;
          unit_price: number;
          minimum_unit_price: number;
          quantity: number;
          line_total: number;
          currency: string;
          created_at?: string;
        };
        Update: {
          product_title_snapshot?: string;
          unit_price?: number;
          minimum_unit_price?: number;
          quantity?: number;
          line_total?: number;
          currency?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          workspace_id: string;
          order_id: string;
          from_status: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned" | null;
          to_status: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
          actor_id: string | null;
          actor_name: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          order_id: string;
          from_status?: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned" | null;
          to_status: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
          actor_id?: string | null;
          actor_name: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          from_status?: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned" | null;
          to_status?: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
          actor_id?: string | null;
          actor_name?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      order_change_history: {
        Row: {
          id: string;
          workspace_id: string;
          order_id: string;
          actor_id: string | null;
          actor_name: string;
          change_kind: "details_updated";
          reason: string | null;
          before_state: Json;
          after_state: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          order_id: string;
          actor_id?: string | null;
          actor_name: string;
          change_kind?: "details_updated";
          reason?: string | null;
          before_state: Json;
          after_state: Json;
          created_at?: string;
        };
        Update: {
          actor_id?: string | null;
          actor_name?: string;
          change_kind?: "details_updated";
          reason?: string | null;
          before_state?: Json;
          after_state?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "order_change_history_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_change_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_change_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      objections: {
        Row: {
          id: string;
          workspace_id: string;
          product_id: string | null;
          objection_title: string;
          rebuttal_args: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          product_id?: string | null;
          objection_title: string;
          rebuttal_args: string[];
          created_at?: string;
        };
        Update: {
          product_id?: string | null;
          objection_title?: string;
          rebuttal_args?: string[];
        };
        Relationships: [];
      };
      custom_objects: {
        Row: {
          slug: string;
          workspace_id: string | null;
          singular_name: string;
          plural_name: string;
          icon: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          slug: string;
          workspace_id?: string | null;
          singular_name: string;
          plural_name: string;
          icon?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          singular_name?: string;
          plural_name?: string;
          icon?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      attribute_definitions: {
        Row: {
          id: string;
          workspace_id: string | null;
          object_slug: string;
          slug: string;
          name: string;
          data_type: string;
          options: Json | null;
          is_ai: boolean;
          ai_prompt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          object_slug: string;
          slug: string;
          name: string;
          data_type: string;
          options?: Json | null;
          is_ai?: boolean;
          ai_prompt?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          data_type?: string;
          options?: Json | null;
          is_ai?: boolean;
          ai_prompt?: string | null;
        };
        Relationships: [];
      };
      record_entities: {
        Row: {
          id: string;
          workspace_id: string | null;
          object_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          object_slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          object_slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      record_values: {
        Row: {
          id: string;
          workspace_id: string | null;
          record_id: string;
          attribute_slug: string;
          value_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          record_id: string;
          attribute_slug: string;
          value_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          value_json?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflows: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          trigger_event: string;
          conditions: Json;
          actions: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          name: string;
          description?: string | null;
          trigger_event: string;
          conditions?: Json;
          actions?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          trigger_event?: string;
          conditions?: Json;
          actions?: Json;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_executions: {
        Row: {
          id: string;
          workspace_id: string | null;
          rule_id: string | null;
          trigger_event: string;
          status: string;
          execution_time_ms: number;
          logs: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          rule_id?: string | null;
          trigger_event: string;
          status?: string;
          execution_time_ms?: number;
          logs?: Json;
          created_at?: string;
        };
        Update: {
          status?: string;
          execution_time_ms?: number;
          logs?: Json;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string | null;
          timestamp: string;
          actor_id: string;
          actor_name: string;
          action: string;
          target_resource: string;
          details: string;
          severity: string;
          ip_address: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          timestamp?: string;
          actor_id: string;
          actor_name: string;
          action: string;
          target_resource: string;
          details: string;
          severity?: string;
          ip_address?: string;
        };
        Update: {
          actor_id?: string;
          actor_name?: string;
          action?: string;
          target_resource?: string;
          details?: string;
          severity?: string;
          ip_address?: string;
        };
        Relationships: [];
      };
      training_sessions: {
        Row: {
          id: string;
          workspace_id: string;
          operator_id: string;
          scenario_id: string;
          scenario_title: string;
          customer_name: string;
          target_product: string;
          status: string;
          duration_seconds: number;
          ai_source: string | null;
          scorecard: Json;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          operator_id: string;
          scenario_id: string;
          scenario_title: string;
          customer_name: string;
          target_product: string;
          status?: string;
          duration_seconds?: number;
          ai_source?: string | null;
          scorecard?: Json;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          duration_seconds?: number;
          ai_source?: string | null;
          scorecard?: Json;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      training_session_turns: {
        Row: {
          id: string;
          session_id: string;
          workspace_id: string;
          sequence_number: number;
          speaker: string;
          text: string;
          source: string;
          occurred_at: string;
          confidence: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          workspace_id: string;
          sequence_number: number;
          speaker: string;
          text: string;
          source: string;
          occurred_at?: string;
          confidence?: number | null;
        };
        Update: {
          sequence_number?: number;
          speaker?: string;
          text?: string;
          source?: string;
          occurred_at?: string;
          confidence?: number | null;
        };
        Relationships: [];
      };
      user_gamification: {
        Row: {
          user_id: string;
          level: number;
          xp: number;
          badges: Json;
          stats: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          level?: number;
          xp?: number;
          badges?: Json;
          stats?: Json;
          updated_at?: string;
        };
        Update: {
          level?: number;
          xp?: number;
          badges?: Json;
          stats?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_settings: {
        Row: {
          workspace_id: string;
          currency: "CZK" | "EUR" | "PLN";
          monthly_commission_rate: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          currency?: "CZK" | "EUR" | "PLN";
          monthly_commission_rate?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          currency?: "CZK" | "EUR" | "PLN";
          monthly_commission_rate?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_bonus_rules: {
        Row: {
          id: string;
          workspace_id: string;
          currency: "CZK" | "EUR" | "PLN";
          minimum_order_amount: number;
          bonus_amount: number;
          effective_from: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          currency: "CZK" | "EUR" | "PLN";
          minimum_order_amount: number;
          bonus_amount: number;
          effective_from?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          currency?: "CZK" | "EUR" | "PLN";
          minimum_order_amount?: number;
          bonus_amount?: number;
          effective_from?: string;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          amount: number;
          currency: "CZK" | "EUR" | "PLN";
          transaction_type: "order_bonus" | "monthly_commission" | "manual_adjustment" | "reversal";
          source_type: "order" | "commission_period" | "manual";
          source_event_id: string;
          source_order_id: string | null;
          source_period_start: string | null;
          reason: string;
          author_id: string | null;
          audit_log_id: string | null;
          rule_snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          amount: number;
          currency: "CZK" | "EUR" | "PLN";
          transaction_type: "order_bonus" | "monthly_commission" | "manual_adjustment" | "reversal";
          source_type: "order" | "commission_period" | "manual";
          source_event_id: string;
          source_order_id?: string | null;
          source_period_start?: string | null;
          reason: string;
          author_id?: string | null;
          audit_log_id?: string | null;
          rule_snapshot?: Json;
          created_at?: string;
        };
        Update: {
          reason?: string;
          rule_snapshot?: Json;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_product_script_draft: {
        Args: {
          p_workspace_id: string;
          p_product_id: string;
          p_content_html: string;
        };
        Returns: Database["public"]["Tables"]["product_script_versions"]["Row"][];
      };
      publish_product_script_version: {
        Args: {
          p_version_id: string;
        };
        Returns: Database["public"]["Tables"]["product_script_versions"]["Row"][];
      };
      update_wallet_settings: {
        Args: {
          p_workspace_id: string;
          p_currency: "CZK" | "EUR" | "PLN";
          p_monthly_commission_rate: number;
        };
        Returns: Database["public"]["Tables"]["wallet_settings"]["Row"];
      };
      add_wallet_bonus_rule: {
        Args: {
          p_workspace_id: string;
          p_currency: "CZK" | "EUR" | "PLN";
          p_minimum_order_amount: number;
          p_bonus_amount: number;
          p_effective_from?: string;
        };
        Returns: Database["public"]["Tables"]["wallet_bonus_rules"]["Row"];
      };
      add_wallet_manual_adjustment: {
        Args: {
          p_workspace_id: string;
          p_user_id: string;
          p_amount: number;
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["wallet_transactions"]["Row"];
      };
      get_wallet_balances: {
        Args: { p_workspace_id: string };
        Returns: Array<{
          user_id: string;
          transaction_count: number;
          balance: number;
          total_credits: number;
          total_debits: number;
        }>;
      };
      record_order_fulfillment_event: {
        Args: {
          p_order_id: string;
          p_status: "delivered" | "returned";
          p_event_id: string;
          p_occurred_at?: string;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      finalize_wallet_monthly_commission: {
        Args: {
          p_workspace_id: string;
          p_user_id: string;
          p_period_start: string;
        };
        Returns: Database["public"]["Tables"]["wallet_transactions"]["Row"];
      };
    };
  };
}
