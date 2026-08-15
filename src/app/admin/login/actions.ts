"use server";

import { redirect } from "next/navigation";
import { createClientOrNull } from "@/lib/supabase/server";
import type { LoginState } from "@/lib/form-state";

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
