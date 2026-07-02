import { describe, expect, it, vi } from "vitest";

import { errorResponse } from "@/lib/api/responses";
import {
  createAdminApprovedSubmission,
  createSubmission,
  getAutoApproveSetting,
  getSubmissionAnalytics,
  getSubmissionStatus,
  listAdminSubmissions,
  moderateSubmission,
  setAutoApproveSetting,
  type AdminApiDeps,
  type SubmissionApiDeps
} from "@/lib/api/submissions";
import { hmacSha256 } from "@/lib/security/hash";
import type { SubmissionStore } from "@/lib/submissions/store";
import type { AdminSubmission, DisplaySubmission, PublicSubmission, SubmissionRecord, SubmissionStatus } from "@/lib/submissions/types";

const secrets = {
  tokenSecret: "test-token-secret",
  ipHashSecret: "test-ip-secret"
};

describe("submission API handlers", () => {
  it("creates an approved submission by default and lets the submitter poll status", async () => {
    const store = new FakeSubmissionStore();
    const deps: SubmissionApiDeps = { store, secrets };
    const createResponse = await createSubmission(jsonRequest("http://test.local/api/submissions", { name: "Ada" }), deps);
    const createPayload = (await createResponse.json()) as { id: string; token: string; status: SubmissionStatus };

    expect(createResponse.status).toBe(201);
    expect(createPayload.status).toBe("approved");

    const statusResponse = await getSubmissionStatus(
      new Request(`http://test.local/api/submissions/${createPayload.id}?token=${createPayload.token}`),
      createPayload.id,
      deps
    );

    expect(statusResponse.status).toBe(200);
    await expect(statusResponse.json()).resolves.toMatchObject({
      id: createPayload.id,
      name: "Ada",
      status: "approved"
    });
  });

  it("creates pending submissions when auto-approve is disabled", async () => {
    const store = new FakeSubmissionStore();
    store.autoApprove = false;

    const response = await createSubmission(jsonRequest("http://test.local/api/submissions", { name: "Ada" }), {
      store,
      secrets
    });
    const payload = (await response.json()) as { status: SubmissionStatus };

    expect(response.status).toBe(201);
    expect(payload.status).toBe("pending");
    await expect(store.listDisplaySubmissions()).resolves.toHaveLength(0);
  });

  it("rejects invalid names", async () => {
    const response = await createSubmission(jsonRequest("http://test.local/api/submissions", { name: "<>" }), {
      store: new FakeSubmissionStore(),
      secrets
    });

    expect(response.status).toBe(400);
  });

  it("rate limits repeated submissions by hashed IP", async () => {
    const store = new FakeSubmissionStore();
    store.recentCount = 4;

    const response = await createSubmission(jsonRequest("http://test.local/api/submissions", { name: "Ada" }), {
      store,
      secrets
    });

    expect(response.status).toBe(429);
  });

  it("creates approved submissions when auto-approve is enabled", async () => {
    const store = new FakeSubmissionStore();
    store.autoApprove = true;

    const response = await createSubmission(jsonRequest("http://test.local/api/submissions", { name: "Ada" }), {
      store,
      secrets
    });
    const payload = (await response.json()) as { status: SubmissionStatus };

    expect(response.status).toBe(201);
    expect(payload.status).toBe("approved");
    await expect(store.listDisplaySubmissions()).resolves.toHaveLength(1);
  });

  it("requires a valid client token to poll status", async () => {
    const store = new FakeSubmissionStore();
    const row = store.addRecord("Ada", "wrong-token");

    const response = await getSubmissionStatus(new Request(`http://test.local/api/submissions/${row.id}?token=bad`), row.id, {
      store,
      secrets
    });

    expect(response.status).toBe(404);
  });
});

describe("admin API handlers", () => {
  it("lists pending submissions for admins", async () => {
    const store = new FakeSubmissionStore();
    store.addRecord("Ada", "token");
    const deps = adminDeps(store);

    const response = await listAdminSubmissions(new Request("http://test.local/api/admin/submissions?status=pending"), deps);
    const payload = (await response.json()) as { submissions: AdminSubmission[] };

    expect(response.status).toBe(200);
    expect(payload.submissions).toHaveLength(1);
  });

  it("approves submissions with the admin email", async () => {
    const store = new FakeSubmissionStore();
    const row = store.addRecord("Ada", "token");
    const response = await moderateSubmission(new Request("http://test.local/api/admin/submissions/id/approve"), row.id, "approved", adminDeps(store));
    const payload = (await response.json()) as { submission: AdminSubmission };

    expect(response.status).toBe(200);
    expect(payload.submission.status).toBe("approved");
    expect(payload.submission.approved_by).toBe("host@example.com");
  });

  it("creates already-approved submissions from the admin page", async () => {
    const store = new FakeSubmissionStore();
    const response = await createAdminApprovedSubmission(jsonRequest("http://test.local/api/admin/submissions", { name: "Grace" }), {
      ...adminDeps(store),
      tokenSecret: secrets.tokenSecret
    });
    const payload = (await response.json()) as { submission: AdminSubmission };

    expect(response.status).toBe(201);
    expect(payload.submission).toMatchObject({
      name: "Grace",
      status: "approved",
      approved_by: "host@example.com"
    });
    await expect(store.listDisplaySubmissions()).resolves.toHaveLength(1);
  });

  it("lets admins read and update auto-approve", async () => {
    const store = new FakeSubmissionStore();
    const deps = adminDeps(store);
    const updateResponse = await setAutoApproveSetting(jsonRequest("http://test.local/api/admin/settings/auto-approve", { enabled: true }), deps);
    const updatePayload = (await updateResponse.json()) as { enabled: boolean };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.enabled).toBe(true);

    const readResponse = await getAutoApproveSetting(new Request("http://test.local/api/admin/settings/auto-approve"), deps);
    await expect(readResponse.json()).resolves.toEqual({ enabled: true });
  });

  it("returns submission analytics for admins", async () => {
    const store = new FakeSubmissionStore();
    store.addRecord("Pending", "token");
    const autoApproved = store.addRecord("Ada", "token");
    autoApproved.status = "approved";
    autoApproved.approved_at = new Date("2026-06-22T12:01:00.000Z").toISOString();
    autoApproved.approved_by = "auto-approve";
    const rejected = store.addRecord("Grace", "token");
    rejected.status = "rejected";
    rejected.rejected_at = new Date("2026-06-22T12:02:00.000Z").toISOString();

    const response = await getSubmissionAnalytics(new Request("http://test.local/api/admin/analytics"), adminDeps(store));
    const payload = (await response.json()) as { analytics: Awaited<ReturnType<SubmissionStore["getSubmissionAnalytics"]>> };

    expect(response.status).toBe(200);
    expect(payload.analytics).toMatchObject({
      total: 3,
      approved: 1,
      pending: 1,
      rejected: 1,
      autoApproved: 1
    });
  });

  it("returns unauthorized responses from the admin checker", async () => {
    const store = new FakeSubmissionStore();
    const response = await listAdminSubmissions(new Request("http://test.local/api/admin/submissions"), {
      store,
      assertAdmin: vi.fn(async () => ({ ok: false as const, response: errorResponse("No session.", 401) }))
    });

    expect(response.status).toBe(401);
  });
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.8"
    },
    body: JSON.stringify(body)
  });
}

function adminDeps(store: SubmissionStore): AdminApiDeps {
  return {
    store,
    assertAdmin: vi.fn(async () => ({
      ok: true as const,
      admin: {
        id: "admin-id",
        email: "host@example.com"
      }
    }))
  };
}

class FakeSubmissionStore implements SubmissionStore {
  recentCount = 0;
  autoApprove = true;
  private records: SubmissionRecord[] = [];

  async countRecentByIpHash(): Promise<number> {
    return this.recentCount;
  }

  async insertSubmission(input: {
    name: string;
    clientTokenHash: string;
    ipHash: string;
    status?: "pending" | "approved";
    approvedBy?: string | null;
  }): Promise<PublicSubmission> {
    const record = this.addRecord(input.name, null, input.clientTokenHash, input.ipHash);
    record.status = input.status ?? "pending";
    record.approved_at = record.status === "approved" ? new Date("2026-06-22T12:01:00.000Z").toISOString() : null;
    record.approved_by = record.status === "approved" ? (input.approvedBy ?? "auto-approve") : null;

    return pickPublic(record);
  }

  async insertApprovedSubmission(input: { name: string; clientTokenHash: string; adminEmail: string }): Promise<AdminSubmission> {
    const record = this.addRecord(input.name, null, input.clientTokenHash, null);
    record.status = "approved";
    record.approved_at = new Date("2026-06-22T12:01:00.000Z").toISOString();
    record.approved_by = input.adminEmail;

    return pickAdmin(record);
  }

  async getSubmissionById(id: string): Promise<SubmissionRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async listAdminSubmissions(status?: SubmissionStatus): Promise<AdminSubmission[]> {
    return this.records
      .filter((record) => !status || record.status === status)
      .map((record) => ({
        id: record.id,
        name: record.name,
        status: record.status,
        created_at: record.created_at,
        approved_at: record.approved_at,
        rejected_at: record.rejected_at,
        approved_by: record.approved_by
      }));
  }

  async listDisplaySubmissions(): Promise<DisplaySubmission[]> {
    return this.records
      .filter((record) => record.status === "approved")
      .map((record) => ({
        id: record.id,
        name: record.name,
        approved_at: record.approved_at
      }));
  }

  async getSubmissionAnalytics() {
    const submittedLastHourSince = Date.now() - 60 * 60 * 1000;
    const createdTimes = this.records.map((record) => Date.parse(record.created_at)).filter(Number.isFinite);

    return {
      total: this.records.length,
      approved: this.records.filter((record) => record.status === "approved").length,
      pending: this.records.filter((record) => record.status === "pending").length,
      rejected: this.records.filter((record) => record.status === "rejected").length,
      autoApproved: this.records.filter((record) => record.status === "approved" && record.approved_by === "auto-approve").length,
      submittedLastHour: this.records.filter((record) => Date.parse(record.created_at) >= submittedLastHourSince).length,
      latestSubmissionAt: createdTimes.length > 0 ? new Date(Math.max(...createdTimes)).toISOString() : null
    };
  }

  async setStatus(id: string, status: "approved" | "rejected", adminEmail: string): Promise<AdminSubmission | null> {
    const record = this.records.find((item) => item.id === id);

    if (!record) {
      return null;
    }

    record.status = status;
    record.approved_by = adminEmail;
    record.approved_at = status === "approved" ? new Date().toISOString() : null;
    record.rejected_at = status === "rejected" ? new Date().toISOString() : null;

    return {
      ...pickAdmin(record)
    };
  }

  async getAutoApproveSubmissions(): Promise<boolean> {
    return this.autoApprove;
  }

  async setAutoApproveSubmissions(enabled: boolean): Promise<boolean> {
    this.autoApprove = enabled;
    return enabled;
  }

  addRecord(name: string, token: string | null, clientTokenHash?: string, ipHash: string | null = "ip-hash"): SubmissionRecord {
    const id = `sub-${this.records.length + 1}`;
    const record: SubmissionRecord = {
      id,
      name,
      status: "pending",
      client_token_hash: clientTokenHash ?? hmacSha256(token ?? "token", secrets.tokenSecret),
      ip_hash: ipHash,
      created_at: new Date("2026-06-22T12:00:00.000Z").toISOString(),
      approved_at: null,
      rejected_at: null,
      approved_by: null
    };

    this.records.push(record);
    return record;
  }
}

function pickPublic(record: SubmissionRecord): PublicSubmission {
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    created_at: record.created_at,
    approved_at: record.approved_at
  };
}

function pickAdmin(record: SubmissionRecord): AdminSubmission {
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    created_at: record.created_at,
    approved_at: record.approved_at,
    rejected_at: record.rejected_at,
    approved_by: record.approved_by
  };
}
