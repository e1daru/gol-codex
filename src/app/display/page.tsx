import { DisplayClient } from "@/features/display/display-client";
import { getPublicAppUrl } from "@/lib/supabase/env";

export default function DisplayPage() {
  return <DisplayClient submitUrl={`${getPublicAppUrl()}/submit`} />;
}
