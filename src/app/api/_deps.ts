import { assertAdminRequest } from "@/lib/admin/auth";
import { getRequiredSecret } from "@/lib/supabase/env";
import { createSupabaseSubmissionStore } from "@/lib/submissions/store";

export function getSubmissionApiDeps() {
  const tokenSecret = getRequiredSecret("SUBMISSION_TOKEN_SECRET");
  const ipHashSecret = getRequiredSecret("IP_HASH_SECRET");

  return {
    store: createSupabaseSubmissionStore(),
    secrets: tokenSecret && ipHashSecret ? { tokenSecret, ipHashSecret } : null
  };
}

export function getAdminApiDeps() {
  return {
    store: createSupabaseSubmissionStore(),
    assertAdmin: assertAdminRequest
  };
}

export function getAdminCreateApiDeps() {
  return {
    ...getAdminApiDeps(),
    tokenSecret: getRequiredSecret("SUBMISSION_TOKEN_SECRET")
  };
}
