import { getAdminApiDeps } from "@/app/api/_deps";
import { getSubmissionAnalytics } from "@/lib/api/submissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getSubmissionAnalytics(request, getAdminApiDeps());
}
