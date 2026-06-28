import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminSubmission, DisplaySubmission, PublicSubmission, SubmissionRecord, SubmissionStatus } from "@/lib/submissions/types";

const AUTO_APPROVE_SETTING_KEY = "auto_approve_submissions";
let fallbackAutoApproveSubmissions = false;

export type InsertSubmissionInput = {
  name: string;
  clientTokenHash: string;
  ipHash: string;
  status?: Extract<SubmissionStatus, "pending" | "approved">;
  approvedBy?: string | null;
};

export type InsertApprovedSubmissionInput = {
  name: string;
  clientTokenHash: string;
  adminEmail: string;
};

export type SubmissionStore = {
  countRecentByIpHash(ipHash: string, sinceIso: string): Promise<number>;
  insertSubmission(input: InsertSubmissionInput): Promise<PublicSubmission>;
  insertApprovedSubmission(input: InsertApprovedSubmissionInput): Promise<AdminSubmission>;
  getSubmissionById(id: string): Promise<SubmissionRecord | null>;
  listAdminSubmissions(status?: SubmissionStatus): Promise<AdminSubmission[]>;
  listDisplaySubmissions(): Promise<DisplaySubmission[]>;
  setStatus(id: string, status: Exclude<SubmissionStatus, "pending">, adminEmail: string): Promise<AdminSubmission | null>;
  getAutoApproveSubmissions(): Promise<boolean>;
  setAutoApproveSubmissions(enabled: boolean, adminEmail: string): Promise<boolean>;
};

export function createSupabaseSubmissionStore(): SubmissionStore | null {
  const client = createServiceSupabaseClient();

  if (!client) {
    return null;
  }

  return new SupabaseSubmissionStore(client);
}

class SupabaseSubmissionStore implements SubmissionStore {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async countRecentByIpHash(ipHash: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.client
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", sinceIso);

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async insertSubmission(input: InsertSubmissionInput): Promise<PublicSubmission> {
    const status = input.status ?? "pending";
    const approvedAt = status === "approved" ? new Date().toISOString() : null;
    const { data, error } = await this.client
      .from("submissions")
      .insert({
        name: input.name,
        status,
        client_token_hash: input.clientTokenHash,
        ip_hash: input.ipHash,
        approved_at: approvedAt,
        rejected_at: null,
        approved_by: status === "approved" ? (input.approvedBy ?? "auto-approve") : null
      })
      .select("id,name,status,created_at,approved_at")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async insertApprovedSubmission(input: InsertApprovedSubmissionInput): Promise<AdminSubmission> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("submissions")
      .insert({
        name: input.name,
        status: "approved",
        client_token_hash: input.clientTokenHash,
        ip_hash: null,
        approved_at: now,
        rejected_at: null,
        approved_by: input.adminEmail
      })
      .select("id,name,status,created_at,approved_at,rejected_at,approved_by")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getSubmissionById(id: string): Promise<SubmissionRecord | null> {
    const { data, error } = await this.client.from("submissions").select("*").eq("id", id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async listAdminSubmissions(status?: SubmissionStatus): Promise<AdminSubmission[]> {
    let query = this.client
      .from("submissions")
      .select("id,name,status,created_at,approved_at,rejected_at,approved_by")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async listDisplaySubmissions(): Promise<DisplaySubmission[]> {
    const { data, error } = await this.client
      .from("submissions")
      .select("id,name,approved_at")
      .eq("status", "approved")
      .order("approved_at", { ascending: true })
      .limit(300);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async setStatus(
    id: string,
    status: Exclude<SubmissionStatus, "pending">,
    adminEmail: string
  ): Promise<AdminSubmission | null> {
    const now = new Date().toISOString();
    const patch =
      status === "approved"
        ? {
            status,
            approved_at: now,
            rejected_at: null,
            approved_by: adminEmail
          }
        : {
            status,
            approved_at: null,
            rejected_at: now,
            approved_by: adminEmail
          };

    const { data, error } = await this.client
      .from("submissions")
      .update(patch)
      .eq("id", id)
      .select("id,name,status,created_at,approved_at,rejected_at,approved_by")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async getAutoApproveSubmissions(): Promise<boolean> {
    const { data, error } = await this.client
      .from("app_settings")
      .select("value")
      .eq("key", AUTO_APPROVE_SETTING_KEY)
      .maybeSingle();

    if (error) {
      if (isMissingSettingsTableError(error)) {
        return fallbackAutoApproveSubmissions;
      }

      throw error;
    }

    if (!data) {
      return false;
    }

    return isEnabledSetting(data.value);
  }

  async setAutoApproveSubmissions(enabled: boolean, adminEmail: string): Promise<boolean> {
    const { error } = await this.client.from("app_settings").upsert({
      key: AUTO_APPROVE_SETTING_KEY,
      value: { enabled },
      updated_at: new Date().toISOString(),
      updated_by: adminEmail
    });

    if (error) {
      if (isMissingSettingsTableError(error)) {
        fallbackAutoApproveSubmissions = enabled;
        return enabled;
      }

      throw error;
    }

    fallbackAutoApproveSubmissions = enabled;
    return enabled;
  }
}

function isEnabledSetting(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "enabled" in value && (value as { enabled?: unknown }).enabled === true);
}

function isMissingSettingsTableError(error: { code?: string; message?: string }): boolean {
  const details = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (details.includes("app_settings") && (details.includes("does not exist") || details.includes("schema cache")))
  );
}
