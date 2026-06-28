import { getAdminApiDeps } from "@/app/api/_deps";
import { moderateSubmission } from "@/lib/api/submissions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return moderateSubmission(request, id, "rejected", getAdminApiDeps());
}
