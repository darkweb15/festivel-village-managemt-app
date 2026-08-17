"use client";

import { useActionState, useId } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { changePassword } from "@/app/admin/account-actions";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The password never leaves this form except in the server action's POST body.
 * There is no client-side Supabase call here on purpose — that would put the
 * password into a browser fetch, and the session is server-side anyway.
 *
 * `viaRecovery` comes from the httpOnly cookie that /auth/confirm sets after
 * verifying an emailed link. In that mode there is no current password to ask
 * for; the server re-checks the same cookie, so this prop cannot be used to
 * skip the check by tampering with the page.
 */
export function ChangePasswordForm({ viaRecovery }: { viaRecovery: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    changePassword,
    EMPTY_ACTION_STATE,
  );
  const currentId = useId();
  const newId = useId();
  const confirmId = useId();

  if (state.ok) {
    return (
      <div className="card flex flex-col items-center px-6 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-success-50 text-success-700">
          <CheckCircle2 className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <p className="mt-4 text-[0.9375rem] font-semibold text-ink-900">
          Password changed
        </p>
        <p className="mt-1.5 max-w-[22rem] text-[0.8125rem] leading-relaxed text-ink-600">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5">
      {viaRecovery ? (
        <div className="flex gap-3 rounded-tile bg-saffron-50 p-3.5">
          <Info
            className="mt-px size-[1.15rem] shrink-0 text-saffron-600"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-[0.75rem] leading-relaxed text-ink-600">
            You arrived from a recovery link, so you can set a new password
            without the old one. This lasts a few minutes.
          </p>
        </div>
      ) : (
        <PasswordField
          id={currentId}
          name="current_password"
          label="Current password"
          autoComplete="current-password"
          error={state.fieldErrors.current_password}
          required
        />
      )}

      <PasswordField
        id={newId}
        name="new_password"
        label="New password"
        hint="At least 12 characters. A short phrase you can remember works well."
        autoComplete="new-password"
        error={state.fieldErrors.new_password}
        required
      />

      <PasswordField
        id={confirmId}
        name="confirm_password"
        label="Confirm new password"
        autoComplete="new-password"
        error={state.fieldErrors.confirm_password}
        required
      />

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
        loadingLabel="Changing…"
      >
        Change password
      </Button>

      <p className="text-center text-[0.75rem] leading-relaxed text-ink-400">
        Changing your password signs out every other device.
      </p>
    </form>
  );
}

function PasswordField({
  id,
  name,
  label,
  hint,
  error,
  ...input
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<React.ComponentProps<"input">, "id" | "name" | "type">) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-12 w-full rounded-tile border bg-white px-3.5 text-[0.9375rem] text-ink-900 transition-colors",
          "focus:border-saffron-500 focus:outline-none",
          error ? "border-danger-500" : "border-ink-200",
        )}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.75rem] text-danger-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.75rem] text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
