"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { Loader2, Lock } from "lucide-react";
import { signIn } from "@/app/admin/login/actions";
import { EMPTY_LOGIN_STATE, type LoginState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    EMPTY_LOGIN_STATE,
  );
  const emailId = useId();
  const passwordId = useId();

  return (
    <form action={action} className="card space-y-4 px-5 py-6">
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor={emailId}
          className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700"
        >
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-12 w-full rounded-tile border border-ink-200 bg-white px-3.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-300 focus:border-saffron-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor={passwordId}
            className="block text-[0.8125rem] font-medium text-ink-700"
          >
            Password
          </label>
          <Link
            href="/admin/forgot-password"
            className="text-[0.75rem] font-medium text-saffron-700 underline underline-offset-4 hover:text-saffron-800"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-tile border border-ink-200 bg-white px-3.5 text-[0.9375rem] text-ink-900 focus:border-saffron-500 focus:outline-none"
        />
      </div>

      {state.message ? (
        <p
          role="alert"
          className="rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-danger-700"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          <>
            <Lock className="size-4" strokeWidth={2.2} aria-hidden />
            Sign in
          </>
        )}
      </Button>

      <p className="text-center text-[0.75rem] leading-relaxed text-ink-400">
        Accounts are created by an existing admin in Supabase. There is no public
        sign-up.
      </p>
    </form>
  );
}
