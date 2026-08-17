"use client";

import { useActionState, useId } from "react";
import { MailCheck, Send } from "lucide-react";
import { requestPasswordReset } from "@/app/admin/login/actions";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    EMPTY_ACTION_STATE,
  );
  const emailId = useId();

  if (state.ok) {
    return (
      <div className="card flex flex-col items-center px-6 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-success-50 text-success-700">
          <MailCheck className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <p className="mt-4 text-[0.9375rem] font-semibold text-ink-900">
          Check your email
        </p>
        <p className="mt-1.5 max-w-[20rem] text-[0.8125rem] leading-relaxed text-ink-600">
          {state.message}
        </p>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-400">
          Open the link in this same browser if you can. If nothing arrives,
          check spam, then ask an admin.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 px-5 py-6">
      <p className="text-[0.8125rem] leading-relaxed text-ink-600">
        Enter the address you sign in with and we’ll email you a link to set a
        new password.
      </p>

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
          placeholder="you@example.com"
          aria-invalid={state.fieldErrors.email ? true : undefined}
          aria-describedby={state.fieldErrors.email ? `${emailId}-error` : undefined}
          className={cn(
            "h-12 w-full rounded-tile border bg-white px-3.5 text-[0.9375rem] text-ink-900 transition-colors placeholder:text-ink-300",
            "focus:border-saffron-500 focus:outline-none",
            state.fieldErrors.email ? "border-danger-500" : "border-ink-200",
          )}
        />
        {state.fieldErrors.email ? (
          <p
            id={`${emailId}-error`}
            role="alert"
            className="mt-1.5 text-[0.75rem] text-danger-700"
          >
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-danger-700"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        loadingLabel="Sending…"
      >
        <Send className="size-4" strokeWidth={2.2} aria-hidden />
        Send reset link
      </Button>
    </form>
  );
}
