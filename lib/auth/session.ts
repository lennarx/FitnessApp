import { createClient } from "@/lib/supabase/client";

/**
 * Reads the persisted local session — no network call. Deliberately uses
 * getSession(), never getUser() (which validates against Supabase's servers
 * and would incorrectly fail while offline). Login always requires network,
 * so by the time AuthGuard has let the user reach a write form, a session
 * is guaranteed to be persisted locally.
 */
export async function getLocalUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}
