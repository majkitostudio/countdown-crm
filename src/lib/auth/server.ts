import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoAuthEnabled } from "@/lib/auth/config";

/**
 * Authenticates a server-side operation. Server Actions must not rely on the
 * page or proxy that rendered their caller because Actions are independently
 * reachable POST endpoints.
 */
export async function requireAuthenticatedUser() {
  if (isDemoAuthEnabled()) {
    return {
      id: "demo-user",
      email: "demo@countdowncrm.local",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error("Unauthorized");
  }

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
