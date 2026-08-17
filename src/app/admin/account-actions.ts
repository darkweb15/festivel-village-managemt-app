"use server";

import { cookies } from "next/headers";
import { createClientOrNull, getCurrentAppUser } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";
import type { ActionState } from "@/lib/form-state";

/**
 * Password changes for the signed-in committee member.
 *
 * Everything here runs on the server with the anon key and the session cookie —
 * the same credentials the rest of the app uses. There is no service-role key,
 * and the password itself only ever exists in the POST body of this action and
 * the HTTPS request to Supabase. It is never logged, never stored, and never
 * written to any table.
 *
 * `auth.updateUser()` rewrites only the password hash in `auth.users`. The
 * account's UID and its `public.users` role mapping are untouched, so a
 * committee admin stays an admin.
 */

/** Matches the floor enforced by the break-glass script. */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Re-authenticating to prove the old password turns this action into a password
 * oracle if it can be hammered, so attempts are capped per account.
 * In-memory, like the AI route's limiter — it resets on redeploy, which is fine
 * for a committee-sized admin panel.
 */
const ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

function tooManyAttempts(key: string) {
  const now = Date.now();
  const entry = ATTEMPTS.get(key);
  if (!entry || now > entry.resetAt) {
    ATTEMPTS.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function fail(message: string, fieldErrors: Record<string, string> = {}): ActionState {
  return { ok: false, message, fieldErrors };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClientOrNull();
  if (!supabase) return fail("Supabase isn’t configured yet.");

  // The authoritative address is the one on the auth record, not the mirrored
  // copy in public.users — re-authentication has to use what Auth itself holds.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) {
    return fail("Your session has expired. Please sign in again.");
  }

  const user = await getCurrentAppUser();
  if (!user) return fail("Your session has expired. Please sign in again.");

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const fieldErrors: Record<string, string> = {};

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.new_password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (newPassword !== confirmPassword) {
    fieldErrors.confirm_password = "The two passwords don’t match.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please check the highlighted fields.", fieldErrors);
  }

  // A session minted from a one-time recovery link is allowed to set a new
  // password without knowing the old one — that is the entire point of the
  // link. The flag is an httpOnly cookie written by /auth/confirm only after a
  // valid token was verified, so a stolen session cookie alone cannot reach
  // this branch and skip the re-authentication below.
  const cookieStore = await cookies();
  const viaRecovery = cookieStore.get(RECOVERY_COOKIE)?.value === "1";

  if (!viaRecovery) {
    if (!currentPassword) {
      return fail("Please check the highlighted fields.", {
        current_password: "Enter your current password.",
      });
    }

    if (tooManyAttempts(user.id)) {
      return fail("Too many attempts. Please wait 15 minutes and try again.");
    }

    // Supabase has no "verify this password" endpoint, and updateUser() does not
    // ask for the old one — so without this step anyone holding the session
    // cookie could silently take the account over.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: currentPassword,
    });

    if (reauthError) {
      return fail("Please check the highlighted fields.", {
        current_password: "That isn’t your current password.",
      });
    }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    // Supabase enforces its own project-level password policy on top of ours.
    return fail(error.message);
  }

  ATTEMPTS.delete(user.id);
  cookieStore.delete(RECOVERY_COOKIE);

  // Any other browser still holding a session for this account loses it — if the
  // password was changed because it may have leaked, this is what closes it off.
  await supabase.auth.signOut({ scope: "others" });

  return {
    ok: true,
    message: "Your password has been changed. Other devices have been signed out.",
    fieldErrors: {},
  };
}
