import { listDisplaySubmissions } from "@/lib/api/submissions";
import { createSupabaseSubmissionStore } from "@/lib/submissions/store";

export const runtime = "nodejs";

export async function GET() {
  return listDisplaySubmissions({ store: createSupabaseSubmissionStore() });
}
