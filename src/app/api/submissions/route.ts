import { createSubmission } from "@/lib/api/submissions";
import { getSubmissionApiDeps } from "@/app/api/_deps";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return createSubmission(request, getSubmissionApiDeps());
}
