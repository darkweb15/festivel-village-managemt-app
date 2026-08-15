"use client";

import { useActionState, useId, useState } from "react";
import { CheckCircle2, ShieldQuestion } from "lucide-react";
import { submitDonation } from "@/app/(app)/donate/actions";
import {
  EMPTY_DONATION_STATE,
  type DonationFormState,
} from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [101, 501, 1001, 2501];

/**
 * Optional register-your-donation form.
 *
 * The copy is deliberate: the committee confirms every entry manually, and the
 * form says so, because nothing here can verify a UPI transfer.
 */
export function DonationForm() {
  const [state, action, pending] = useActionState<DonationFormState, FormData>(
    submitDonation,
    EMPTY_DONATION_STATE,
  );
  const [amount, setAmount] = useState("");
  const nameId = useId();
  const amountId = useId();
  const refId = useId();
  const phoneId = useId();

  if (state.ok) {
    return (
      <div className="card animate-scale-in flex flex-col items-center px-6 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-success-50 text-success-700">
          <CheckCircle2 className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <p className="mt-4 text-[0.9375rem] font-semibold text-ink-900">
          Recorded, thank you
        </p>
        <p className="mt-1.5 max-w-[19rem] text-[0.8125rem] leading-relaxed text-ink-600">
          {state.message}
        </p>
        <p className="mt-3 text-[0.75rem] text-ink-400">
          It will appear in the public list once a committee member confirms it
          against the bank statement.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5" noValidate>
      <div className="flex gap-3 rounded-tile bg-saffron-50 p-3.5">
        <ShieldQuestion
          className="mt-px size-[1.15rem] shrink-0 text-saffron-600"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-[0.75rem] leading-relaxed text-ink-600">
          Already paid over UPI? Record it here so the committee can match it
          against the account. This form does not process or verify payments.
        </p>
      </div>

      <Field
        id={nameId}
        name="donor_name"
        label="Your name"
        placeholder="e.g. Ramesh Babu"
        required
        error={state.fieldErrors.donor_name}
        autoComplete="name"
      />

      <div>
        <Field
          id={amountId}
          name="amount"
          label="Amount sent"
          placeholder="0"
          required
          inputMode="decimal"
          prefix="₹"
          value={amount}
          onChange={setAmount}
          error={state.fieldErrors.amount}
        />
        <div className="mt-2.5 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(String(value))}
              className={cn(
                "press rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                amount === String(value)
                  ? "border-saffron-600 bg-saffron-50 text-saffron-700"
                  : "border-ink-200 text-ink-600 hover:border-ink-300",
              )}
            >
              ₹{value.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>

      <Field
        id={refId}
        name="transaction_ref"
        label="UPI transaction ID"
        hint="Optional, but it helps the treasurer find your payment"
        placeholder="e.g. 4198XXXXXXXX"
        error={state.fieldErrors.transaction_ref}
      />

      <Field
        id={phoneId}
        name="donor_phone"
        label="Phone number"
        hint="Optional. Only the committee can see this."
        placeholder="+91"
        inputMode="tel"
        autoComplete="tel"
      />

      <label className="flex items-start gap-3 rounded-tile bg-ink-50 p-3.5">
        <input
          type="checkbox"
          name="is_anonymous"
          className="mt-0.5 size-4 shrink-0 accent-saffron-600"
        />
        <span className="text-[0.8125rem] leading-relaxed text-ink-600">
          Show my donation as{" "}
          <span className="font-medium text-ink-900">Anonymous</span> in the public
          list
        </span>
      </label>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] text-danger-700"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        loadingLabel="Saving…"
      >
        Submit donation details
      </Button>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  hint,
  error,
  prefix,
  value,
  onChange,
  ...input
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
  prefix?: string;
  value?: string;
  onChange?: (value: string) => void;
} & Omit<React.ComponentProps<"input">, "id" | "name" | "value" | "onChange">) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700"
      >
        {label}
        {input.required ? (
          <span className="ml-0.5 text-saffron-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[0.9375rem] font-medium text-ink-400">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-tile border bg-white px-3.5 text-[0.9375rem] text-ink-900 transition-colors placeholder:text-ink-300",
            "focus:border-saffron-500 focus:outline-none",
            prefix && "pl-8",
            error ? "border-danger-500" : "border-ink-200",
          )}
          {...(onChange
            ? { value: value ?? "", onChange: (e) => onChange(e.target.value) }
            : {})}
          {...input}
        />
      </div>

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
