import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Refreshes the Supabase session cookie on every request and keeps
 * unauthenticated visitors out of /admin.
 *
 * This is a convenience gate, not the security boundary — RLS in Postgres is.
 * Every admin page also re-checks the role server-side before rendering.
 *
 * Next 16 renamed the `middleware` convention to `proxy`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    // Without keys there is no session to protect; let the page render its
    // own setup instructions.
    return response;
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminArea = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";
  // Reachable without a session — you cannot sign in to ask for a reset.
  const isPublicAdminPage = isLoginPage || pathname === "/admin/forgot-password";

  if (isAdminArea && !isPublicAdminPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, so the session cookie stays fresh.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
