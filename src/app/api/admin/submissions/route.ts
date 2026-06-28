import { getAdminApiDeps, getAdminCreateApiDeps } from "@/app/api/_deps";
import { createAdminApprovedSubmission, listAdminSubmissions } from "@/lib/api/submissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return listAdminSubmissions(request, getAdminApiDeps());
}

export async function POST(request: Request) {
  return createAdminApprovedSubmission(request, getAdminCreateApiDeps());
}
