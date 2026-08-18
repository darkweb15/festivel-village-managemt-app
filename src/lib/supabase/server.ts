import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Always uses the anon key — RLS is what separates public from admin.
 *
 * ONE client per request, and that is load-bearing rather than an optimisation.
 *
 * Supabase refresh tokens rotate: using one mints a replacement and retires the
 * old one. A server client refreshes on demand (`@supabase/ssr` sets
 * `autoRefreshToken: false`), and a Server Component cannot persist the
 * replacement, because `setAll` below is a no-op outside an action — the
 * middleware is what writes the new cookies.
 *
 * Build two clients in one request and they both read the same cookie, so both
 * present the same refresh token. The first succeeds; the second is handed a
 * token that has already been retired, fails, and — this is the dangerous part
 * — falls back to an *anonymous* client rather than raising. The layout would
 * then see a signed-in admin while the page beside it queried as `anon`, and an
 * admin got "permission denied for table events" on a screen they were properly
 * signed in to.
 *
 * `cache` makes the whole request share one client, one session and at most one
 * refresh, so there is no second token to be stale.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; middleware refreshes the
          // session instead, so this is safe to swallow.
        }
      },
    },
  });
});

/**
 * The one deliberately untyped client, for the schema-driven admin CRUD where
 * the table name is chosen at runtime from the allowlist in
 * `src/lib/admin/resources.ts`. Everything else must use `createClient()` so it
 * keeps full column typing.
 */
export async function createDynamicClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

/** `null` when Supabase has not been configured yet, so callers can degrade. */
export async function createClientOrNull() {
  if (!isSupabaseConfigured) return null;
  return createClient();
}

/** The signed-in user's row from public.users, or null. */
export async function getCurrentAppUser() {
  const supabase = await createClientOrNull();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** True when the signed-in user may write committee data. */
export async function requireEditor() {
  const appUser = await getCurrentAppUser();
  if (!appUser || !appUser.is_active) return null;
  if (appUser.role !== "admin" && appUser.role !== "editor") return null;
  return appUser;
}
