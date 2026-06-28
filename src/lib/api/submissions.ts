import { errorResponse, jsonResponse } from "@/lib/api/responses";
import type { AdminCheck } from "@/lib/admin/auth";
import { extractClientIp } from "@/lib/request/ip";
import { generateClientToken, hashClientIp, hmacSha256, verifyHash } from "@/lib/security/hash";
import type { SubmissionStore } from "@/lib/submissions/store";
import type { SubmissionStatus } from "@/lib/submissions/types";
import { validateName } from "@/lib/submissions/validation";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_SUBMISSIONS = 4;

export type SubmissionSecrets = {
  tokenSecret: string;
  ipHashSecret: string;
};

export type AdminChecker = (request: Request) => Promise<AdminCheck>;

export type SubmissionApiDeps = {
  store: SubmissionStore | null;
  secrets: SubmissionSecrets | null;
};

export type AdminApiDeps = {
  store: SubmissionStore | null;
  assertAdmin: AdminChecker;
};

export type AdminCreateApiDeps = AdminApiDeps & {
  tokenSecret: string | null;
};

export async function createSubmission(request: Request, deps: SubmissionApiDeps): Promise<Response> {
  if (!deps.store || !deps.secrets) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const body = await readJsonBody(request);
  const validation = validateName(body?.name);

  if (!validation.ok) {
    return errorResponse(validation.reason, 400);
  }

  const clientIp = extractClientIp(request.headers);
  const ipHash = hashClientIp(clientIp, deps.secrets.ipHashSecret);
  const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const recentCount = await deps.store.countRecentByIpHash(ipHash, sinceIso);

  if (recentCount >= RATE_LIMIT_MAX_SUBMISSIONS) {
    return errorResponse("Too many submissions. Please wait a minute and try again.", 429);
  }

  const token = generateClientToken();
  const clientTokenHash = hmacSha256(token, deps.secrets.tokenSecret);
  const autoApprove = await deps.store.getAutoApproveSubmissions();
  const submission = await deps.store.insertSubmission({
    name: validation.value,
    clientTokenHash,
    ipHash,
    status: autoApprove ? "approved" : "pending",
    approvedBy: autoApprove ? "auto-approve" : null
  });

  return jsonResponse(
    {
      id: submission.id,
      token,
      status: submission.status
    },
    201
  );
}

export async function getSubmissionStatus(request: Request, id: string, deps: SubmissionApiDeps): Promise<Response> {
  if (!deps.store || !deps.secrets) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return errorResponse("Missing submission token.", 401);
  }

  const submission = await deps.store.getSubmissionById(id);
  if (!submission || !verifyHash(token, submission.client_token_hash, deps.secrets.tokenSecret)) {
    return errorResponse("Submission not found.", 404);
  }

  return jsonResponse({
    id: submission.id,
    name: submission.name,
    status: submission.status,
    created_at: submission.created_at,
    approved_at: submission.approved_at
  });
}

export async function listDisplaySubmissions(deps: Pick<SubmissionApiDeps, "store">): Promise<Response> {
  if (!deps.store) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const submissions = await deps.store.listDisplaySubmissions();
  return jsonResponse({ submissions });
}

export async function listAdminSubmissions(request: Request, deps: AdminApiDeps): Promise<Response> {
  if (!deps.store) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const admin = await deps.assertAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const requestedStatus = new URL(request.url).searchParams.get("status");
  const status = parseStatusFilter(requestedStatus);
  const submissions = await deps.store.listAdminSubmissions(status);

  return jsonResponse({ submissions });
}

export async function createAdminApprovedSubmission(request: Request, deps: AdminCreateApiDeps): Promise<Response> {
  if (!deps.store || !deps.tokenSecret) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const admin = await deps.assertAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const body = await readJsonBody(request);
  const validation = validateName(body?.name);

  if (!validation.ok) {
    return errorResponse(validation.reason, 400);
  }

  const token = generateClientToken();
  const submission = await deps.store.insertApprovedSubmission({
    name: validation.value,
    clientTokenHash: hmacSha256(token, deps.tokenSecret),
    adminEmail: admin.admin.email
  });

  return jsonResponse({ submission }, 201);
}

export async function getAutoApproveSetting(request: Request, deps: AdminApiDeps): Promise<Response> {
  if (!deps.store) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const admin = await deps.assertAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const enabled = await deps.store.getAutoApproveSubmissions();
  return jsonResponse({ enabled });
}

export async function setAutoApproveSetting(request: Request, deps: AdminApiDeps): Promise<Response> {
  if (!deps.store) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const admin = await deps.assertAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const body = await readJsonBody(request);
  if (typeof body?.enabled !== "boolean") {
    return errorResponse("Expected enabled to be true or false.", 400);
  }

  const enabled = await deps.store.setAutoApproveSubmissions(body.enabled, admin.admin.email);
  return jsonResponse({ enabled });
}

export async function moderateSubmission(
  request: Request,
  id: string,
  status: Exclude<SubmissionStatus, "pending">,
  deps: AdminApiDeps
): Promise<Response> {
  if (!deps.store) {
    return errorResponse("Submission service is not configured.", 503);
  }

  const admin = await deps.assertAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const submission = await deps.store.setStatus(id, status, admin.admin.email);

  if (!submission) {
    return errorResponse("Submission not found.", 404);
  }

  return jsonResponse({ submission });
}

function parseStatusFilter(status: string | null): SubmissionStatus | undefined {
  if (status === "pending" || status === "approved" || status === "rejected") {
    return status;
  }

  return undefined;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = (await request.json()) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
