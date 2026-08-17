"use server";

import { redirect } from "next/navigation";
import { createClientOrNull } from "@/lib/supabase/server";
import { APP } from "@/lib/constants";
import type { ActionState, LoginState } from "@/lib/form-state";

/**
 * Signs a committee member in.
 *
 * Accounts are created by an existing admin in the Supabase dashboard — there
 * is deliberately no public sign-up, and the role that grants write access is
 * only ever set in SQL.
 */
export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    return { message: "Supabase isn’t configured yet. See the setup guide." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: don't reveal whether the address has an account.
    return { message: "Those details didn’t match an account." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .maybeSingle();

  if (!profile || !profile.is_active || profile.role === "viewer") {
    await supabase.auth.signOut();
    return {
      message:
        "This account isn’t authorised for the admin panel. Ask an admin to grant access.",
    };
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

/**
 * Sends a password recovery email.
 *
 * The link lands on /auth/confirm, which exchanges the token for a session and
 * then allows one password change without the old password.
 *
 * Sending is capped per address so this cannot be used to flood someone's
 * inbox, and the reply is always identical whether or not the address has an
 * account — same reasoning as the deliberately vague sign-in failure above.
 */
const RESET_REQUESTS = new Map<string, { count: number; resetAt: number }>();
const RESET_WINDOW_MS = 15 * 60_000;
const MAX_RESETS_PER_WINDOW = 3;

function resetThrottled(email: string) {
  const now = Date.now();
  const entry = RESET_REQUESTS.get(email);
  if (!entry || now > entry.resetAt) {
    RESET_REQUESTS.set(email, { count: 1, resetAt: now + RESET_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_RESETS_PER_WINDOW;
}

/** Identical whatever happened, so the form can never confirm an address. */
const NEUTRAL_RESET_REPLY: ActionState = {
  ok: true,
  message:
    "If that address has a committee account, a reset link is on its way. It expires in one hour.",
  fieldErrors: {},
};

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      message: "",
      fieldErrors: { email: "Enter the email address you sign in with." },
    };
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase isn’t configured yet. See the setup guide.",
      fieldErrors: {},
    };
  }

  if (resetThrottled(email)) return NEUTRAL_RESET_REPLY;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP.siteUrl}/auth/confirm?next=/admin/account`,
  });

  // The result is deliberately ignored: reporting it would leak whether the
  // address exists.
  return NEUTRAL_RESET_REPLY;
}
