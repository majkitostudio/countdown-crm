import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The generated database contract predates Supabase's current generic
 * inference and currently narrows some mutation builders to `never`. DAL
 * modules keep that compatibility cast in one server-only boundary until the
 * generated types are refreshed from the live schema.
 */
export async function createDataClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}
