import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClientOrNull } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_OPTIONS } from "@/lib/auth/recovery";

/**
 * Landing point for emailed auth links (password recovery, magic link).
 *
 * Without this route a recovery email is useless: the link lands on a URL that
 * never exchanges the token for a session, so the reset silently does nothing.
 *
 * Two link shapes are accepted, because the two ways of sending them differ:
 *
 *   ?token_hash=…&type=recovery  — the email template uses `{{ .TokenHash }}`.
 *     Works for links sent from the Supabase dashboard, because verifying needs
 *     nothing but the token itself.
 *
 *   ?code=…                      — the default `{{ .ConfirmationURL }}` template,
 *     which is PKCE. This only works for resets started from our own login page,
 *     since exchanging the code requires the verifier cookie set at that moment.
 *
 * A link that arrives as a `#access_token=…` fragment cannot work at all — the
 * fragment never leaves the browser. If that happens, switch the email template
 * to the `{{ .TokenHash }}` form.
 */

export const dynamic = "force-dynamic";

/** Only ever bounce to our own admin area, never to a caller-supplied host. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/admin") ? raw : "/admin/account";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClientOrNull();
  if (!supabase) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let verified = false;
  let isRecovery = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
    isRecovery = type === "recovery";
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
    // The PKCE shape carries no type, and we only ever send this link for a
    // reset, so treat a successful exchange as one.
    isRecovery = true;
  }

  if (!verified) {
    // Expired, already used, or opened in a different browser than the one that
    // requested it. The login page explains and offers a fresh link.
    return NextResponse.redirect(new URL("/admin/login?error=link", request.url));
  }

  if (isRecovery) {
    // Lets /admin/account accept a new password without the old one, exactly
    // once and only for the next few minutes.
    const cookieStore = await cookies();
    cookieStore.set(RECOVERY_COOKIE, "1", RECOVERY_COOKIE_OPTIONS);
    return NextResponse.redirect(new URL(`${next}?recovery=1`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
