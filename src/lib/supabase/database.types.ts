import type { SubmissionStatus } from "@/lib/submissions/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          name: string;
          status: SubmissionStatus;
          client_token_hash: string;
          ip_hash: string | null;
          created_at: string;
          approved_at: string | null;
          rejected_at: string | null;
          approved_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          status?: SubmissionStatus;
          client_token_hash: string;
          ip_hash?: string | null;
          created_at?: string;
          approved_at?: string | null;
          rejected_at?: string | null;
          approved_by?: string | null;
        };
        Update: {
          name?: string;
          status?: SubmissionStatus;
          client_token_hash?: string;
          ip_hash?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          approved_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      submission_status: SubmissionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
