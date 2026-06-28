import { getSubmissionStatus } from "@/lib/api/submissions";
import { getSubmissionApiDeps } from "@/app/api/_deps";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return getSubmissionStatus(request, id, getSubmissionApiDeps());
}
