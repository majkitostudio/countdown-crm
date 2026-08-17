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
          role: "admin" | "manager" | "agent";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: "admin" | "manager" | "agent";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: "admin" | "manager" | "agent";
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
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: "admin" | "manager" | "agent";
          status: "ready" | "in_call" | "break";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: "admin" | "manager" | "agent";
          status?: "ready" | "in_call" | "break";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: "admin" | "manager" | "agent";
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
      calls: {
        Row: {
          id: string;
          workspace_id: string | null;
          lead_id: string | null;
          agent_id: string | null;
          duration_seconds: number;
          outcome: "order_placed" | "followup_scheduled" | "objection" | "no_answer" | "completed";
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
          transcript?: string | null;
          ai_sentiment?: string | null;
          created_at?: string;
        };
        Update: {
          lead_id?: string | null;
          agent_id?: string | null;
          duration_seconds?: number;
          outcome?: "order_placed" | "followup_scheduled" | "objection" | "no_answer" | "completed";
          transcript?: string | null;
          ai_sentiment?: string | null;
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
          status: "completed" | "pending" | "cancelled";
          order_source: "previous_call" | "email" | "web_form" | "manual" | "other";
          source_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          lead_id?: string | null;
          product_id?: string | null;
          agent_id?: string | null;
          total_amount: number;
          status?: "completed" | "pending" | "cancelled";
          order_source?: "previous_call" | "email" | "web_form" | "manual" | "other";
          source_note?: string | null;
          created_at?: string;
        };
        Update: {
          lead_id?: string | null;
          product_id?: string | null;
          agent_id?: string | null;
          total_amount?: number;
          status?: "completed" | "pending" | "cancelled";
          order_source?: "previous_call" | "email" | "web_form" | "manual" | "other";
          source_note?: string | null;
        };
        Relationships: [];
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
    };
  };
}
