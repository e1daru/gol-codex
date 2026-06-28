import { errorResponse } from "@/lib/api/responses";
import { getAdminEmails } from "@/lib/supabase/env";
import { createUserSupabaseClient } from "@/lib/supabase/server";

export type AdminIdentity = {
  id: string;
  email: string;
};

export type AdminCheck =
  | {
      ok: true;
      admin: AdminIdentity;
    }
  | {
      ok: false;
      response: Response;
    };

export async function assertAdminRequest(request: Request): Promise<AdminCheck> {
  const token = getBearerToken(request.headers);

  if (!token) {
    return { ok: false, response: errorResponse("Missing admin session.", 401) };
  }

  const supabase = createUserSupabaseClient(token);
  if (!supabase) {
    return { ok: false, response: errorResponse("Supabase is not configured.", 503) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false, response: errorResponse("Invalid admin session.", 401) };
  }

  const email = data.user.email.toLowerCase();
  const adminEmails = getAdminEmails();

  if (adminEmails.length === 0 || !adminEmails.includes(email)) {
    return { ok: false, response: errorResponse("This account is not allowed to moderate submissions.", 403) };
  }

  return {
    ok: true,
    admin: {
      id: data.user.id,
      email
    }
  };
}

export function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("bearer ".length).trim();
  return token || null;
}
