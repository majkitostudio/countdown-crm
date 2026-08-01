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
    };
  };
}
