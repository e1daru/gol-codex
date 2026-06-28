import { getAdminApiDeps } from "@/app/api/_deps";
import { getAutoApproveSetting, setAutoApproveSetting } from "@/lib/api/submissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getAutoApproveSetting(request, getAdminApiDeps());
}

export async function POST(request: Request) {
  return setAutoApproveSetting(request, getAdminApiDeps());
}
