import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicEnv, getSupabaseServiceEnv } from "@/lib/supabase/env";

export function createServiceSupabaseClient() {
  const env = getSupabaseServiceEnv();

  if (!env) {
    return null;
  }

  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createUserSupabaseClient(accessToken: string) {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  return createClient<Database>(env.url, env.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
