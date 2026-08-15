"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertConfigured } from "./env";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client. Safe to call repeatedly — the instance is reused. */
export function createClient() {
  assertConfigured();
  cached ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
