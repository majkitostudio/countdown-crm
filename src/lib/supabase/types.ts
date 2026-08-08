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
      };
      leads: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string | null;
          city: string | null;
          country: string;
          status: "new" | "contacted" | "qualified" | "customer" | "unresponsive";
          ai_score: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          email?: string | null;
          city?: string | null;
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
          country?: string;
          status?: "new" | "contacted" | "qualified" | "customer" | "unresponsive";
          ai_score?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
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
      };
      calls: {
        Row: {
          id: string;
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
      };
      orders: {
        Row: {
          id: string;
          lead_id: string;
          product_id: string;
          agent_id: string | null;
          total_amount: number;
          status: "completed" | "pending" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          product_id: string;
          agent_id?: string | null;
          total_amount: number;
          status?: "completed" | "pending" | "cancelled";
          created_at?: string;
        };
        Update: {
          lead_id?: string;
          product_id?: string;
          agent_id?: string | null;
          total_amount?: number;
          status?: "completed" | "pending" | "cancelled";
        };
      };
      objections: {
        Row: {
          id: string;
          product_id: string;
          objection_title: string;
          rebuttal_args: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          objection_title: string;
          rebuttal_args: string[];
          created_at?: string;
        };
        Update: {
          product_id?: string;
          objection_title?: string;
          rebuttal_args?: string[];
        };
      };
      custom_objects: {
        Row: {
          slug: string;
          singular_name: string;
          plural_name: string;
          icon: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          slug: string;
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
      };
      attribute_definitions: {
        Row: {
          id: string;
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
      };
      record_entities: {
        Row: {
          id: string;
          object_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          object_slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          object_slug?: string;
          updated_at?: string;
        };
      };
      record_values: {
        Row: {
          id: string;
          record_id: string;
          attribute_slug: string;
          value_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
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
      };
      workflows: {
        Row: {
          id: string;
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
      };
      workflow_executions: {
        Row: {
          id: string;
          rule_id: string;
          trigger_event: string;
          status: string;
          execution_time_ms: number;
          logs: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          rule_id: string;
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
      };
      audit_logs: {
        Row: {
          id: string;
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
      };
    };
  };
}
