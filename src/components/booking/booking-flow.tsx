"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Info,
  Share2,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { createBooking } from "@/app/(app)/book/actions";
import { AvailabilityBadge } from "@/components/booking/availability-badge";
import { Button } from "@/components/ui/button";
import { EMPTY_BOOKING_STATE, type BookingFormState } from "@/lib/form-state";
import type { PoojaAvailability } from "@/lib/supabase/types";
import { cn, formatFullDate, formatTime, relativeDayLabel } from "@/lib/utils";

type Step = "details" | "review" | "done";

type Draft = {
  partner1_name: string;
  partner2_name: string;
  phone: string;
  gotram: string;
  email: string;
  notes: string;
};

/**
 * Couple pooja booking.
 *
 * Availability shown here comes from the server render; it is a guide, not a
 * guarantee. The database re-checks capacity under a row lock when the booking
 * is submitted, so if the pooja fills up while this form is open the user gets
 * a clear "just been taken" message rather than an over-booked slot.
 */
export function BookingFlow({ pooja }: { pooja: PoojaAvailability }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [draft, setDraft] = useState<Draft>({
    partner1_name: "",
    partner2_name: "",
    phone: "",
    gotram: "",
    email: "",
    notes: "",
  });

  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    createBooking,
    EMPTY_BOOKING_STATE,
  );

  // The visible step is derived, not synced in an effect: a confirmed booking
  // always shows the confirmation, and a field-level failure always returns to
  // the form where the message is actionable.
  const visibleStep: Step =
    state.status === "confirmed"
      ? "done"
      : state.status === "error" && Object.keys(state.fieldErrors).length > 0
        ? "details"
        : step;

  function close() {
    setOpen(false);
    if (state.status === "confirmed") router.refresh();
    setTimeout(() => {
      setStep("details");
    }, 200);
  }

  const detailsValid =
    draft.partner1_name.trim().length >= 2 &&
    /^\+?[0-9][0-9\s-]{6,18}$/.test(draft.phone.trim());

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={!pooja.is_bookable}
        variant={pooja.is_bookable ? "primary" : "secondary"}
        className="w-full"
      >
        {pooja.is_bookable ? "Book This Pooja" : "Not available"}
      </Button>

      {open ? (
        <Sheet
          title={
            visibleStep === "done"
              ? "Booking confirmed"
              : visibleStep === "review"
                ? "Review your booking"
                : "Couple details"
          }
          onClose={close}
          onBack={visibleStep === "review" ? () => setStep("details") : undefined}
        >
          {visibleStep !== "done" ? (
            <StepProgress current={visibleStep} />
          ) : null}

          {/* Pooja summary stays visible through every step. */}
          {visibleStep !== "done" ? (
            <div className="mx-5 mt-4 rounded-tile bg-saffron-50 px-4 py-3.5">
              <p className="text-[0.9375rem] font-semibold text-ink-900">{pooja.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden />
                  {relativeDayLabel(pooja.pooja_date)} · {formatFullDate(pooja.pooja_date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" strokeWidth={2} aria-hidden />
                  {formatTime(pooja.start_time)}
                </span>
              </div>
              <AvailabilityBadge pooja={pooja} className="mt-2.5" />
            </div>
          ) : null}

          <form action={action} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="pooja_id" value={pooja.pooja_id} />
            <input type="hidden" name="partner1_name" value={draft.partner1_name} />
            <input type="hidden" name="partner2_name" value={draft.partner2_name} />
            <input type="hidden" name="phone" value={draft.phone} />
            <input type="hidden" name="gotram" value={draft.gotram} />
            <input type="hidden" name="email" value={draft.email} />
            <input type="hidden" name="notes" value={draft.notes} />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {visibleStep === "details" ? (
                <DetailsStep draft={draft} setDraft={setDraft} state={state} />
              ) : null}

              {visibleStep === "review" ? <ReviewStep draft={draft} pooja={pooja} /> : null}

              {visibleStep === "done" && state.status === "confirmed" && state.booking ? (
                <DoneStep booking={state.booking} />
              ) : null}

              {state.status === "error" && state.message ? (
                <p
                  role="alert"
                  className="mt-4 rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-danger-700"
                >
                  {state.message}
                  {state.code === "full" || state.code === "duplicate" ? (
                    <span className="mt-1 block text-[0.75rem] text-danger-700/80">
                      Nothing was charged or reserved. Please pick another pooja.
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="border-t border-hairline px-5 py-4">
              {visibleStep === "details" ? (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={!detailsValid}
                  onClick={() => setStep("review")}
                >
                  Review booking
                </Button>
              ) : null}

              {visibleStep === "review" ? (
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={pending}
                  loadingLabel="Confirming…"
                >
                  <Check className="size-4" strokeWidth={2.4} aria-hidden />
                  Confirm booking
                </Button>
              ) : null}

              {visibleStep === "done" ? (
                <Button type="button" size="lg" className="w-full" onClick={close}>
                  Done
                </Button>
              ) : null}
            </div>
          </form>
        </Sheet>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Two-dot progress rail. The pooja is already chosen by the time this sheet
 * opens (the user tapped its card), so the sheet itself only covers Details
 * and Review — showing four steps here would overstate what is left to do.
 */
function StepProgress({ current }: { current: Step }) {
  const steps = [
    { key: "details", label: "Your details" },
    { key: "review", label: "Review" },
  ] as const;
  const activeIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2 px-5 pt-4" aria-label="Booking progress">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold transition-colors duration-[--duration-base]",
                done
                  ? "bg-success-500 text-white"
                  : active
                    ? "bg-saffron-600 text-white"
                    : "bg-ink-200 text-ink-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                "t-caption font-medium transition-colors duration-[--duration-base]",
                active ? "text-ink-900" : "text-ink-400",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "h-px flex-1 transition-colors duration-[--duration-base]",
                  done ? "bg-success-500" : "bg-ink-200",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DetailsStep({
  draft,
  setDraft,
  state,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  state: BookingFormState;
}) {
  const set = (key: keyof Draft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <Field
        label="First person's name"
        required
        value={draft.partner1_name}
        onChange={set("partner1_name")}
        placeholder="e.g. Ramesh Kumar"
        autoComplete="name"
        error={state.fieldErrors.partner1_name}
      />
      <Field
        label="Second person's name"
        value={draft.partner2_name}
        onChange={set("partner2_name")}
        placeholder="e.g. Lakshmi Kumar"
        error={state.fieldErrors.partner2_name}
      />
      <Field
        label="Phone number"
        required
        value={draft.phone}
        onChange={set("phone")}
        placeholder="+91"
        inputMode="tel"
        autoComplete="tel"
        hint="The committee will use this to reach you. It is never shown publicly."
        error={state.fieldErrors.phone}
      />
      <Field
        label="Gotram"
        value={draft.gotram}
        onChange={set("gotram")}
        placeholder="Optional"
        hint="Optional — helpful for the priest during sankalpam."
        error={state.fieldErrors.gotram}
      />
      <Field
        label="Email"
        value={draft.email}
        onChange={set("email")}
        placeholder="Optional"
        inputMode="email"
        error={state.fieldErrors.email}
      />
      <Field
        label="Anything the committee should know"
        value={draft.notes}
        onChange={set("notes")}
        placeholder="Optional"
        multiline
      />
    </div>
  );
}

function ReviewStep({ draft, pooja }: { draft: Draft; pooja: PoojaAvailability }) {
  const couple = [draft.partner1_name, draft.partner2_name].filter(Boolean).join(" & ");

  return (
    <div>
      <p className="mb-4 text-[0.8125rem] leading-relaxed text-ink-500">
        Please check these details. The slot is only held once you confirm.
      </p>

      <dl className="card divide-y divide-hairline overflow-hidden">
        <Row label="Couple" value={couple} />
        {draft.gotram ? <Row label="Gotram" value={draft.gotram} /> : null}
        <Row label="Phone" value={draft.phone} />
        {draft.email ? <Row label="Email" value={draft.email} /> : null}
        <Row label="Pooja" value={pooja.title} />
        <Row label="Date" value={formatFullDate(pooja.pooja_date)} />
        <Row label="Time" value={formatTime(pooja.start_time) ?? ""} />
      </dl>

      {pooja.special_instructions ? (
        <p className="mt-4 flex gap-2.5 rounded-tile bg-ink-50 p-3.5 text-[0.8125rem] leading-relaxed text-ink-600">
          <Info className="mt-px size-4 shrink-0 text-ink-400" strokeWidth={2} aria-hidden />
          {pooja.special_instructions}
        </p>
      ) : null}
    </div>
  );
}

function DoneStep({
  booking,
}: {
  booking: NonNullable<BookingFormState["booking"]>;
}) {
  const couple = [booking.partner1_name, booking.partner2_name].filter(Boolean).join(" & ");

  async function share() {
    const text =
      `Pooja booking confirmed\n` +
      `Booking ID: ${booking.booking_ref}\n` +
      `${booking.pooja_title}\n` +
      `${formatFullDate(booking.pooja_date)} · ${formatTime(booking.start_time)}\n` +
      `${couple}`;
    try {
      if (navigator.share) await navigator.share({ title: "Pooja booking", text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* dismissed or unsupported */
    }
  }

  /**
   * Builds an .ics file in the browser and hands it to the OS. No server round
   * trip and no calendar-provider lock-in — every phone knows what to do with
   * a text/calendar file.
   */
  function addToCalendar() {
    const start = icsStamp(booking.pooja_date, booking.start_time);
    const end = icsStamp(booking.pooja_date, booking.start_time, 90);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sri Krishna Youth//Pooja Booking//EN",
      "BEGIN:VEVENT",
      `UID:${booking.booking_ref}@srikrishnayouth`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(booking.pooja_title)}`,
      `DESCRIPTION:${escapeIcs(`Booking ID ${booking.booking_ref} — ${couple}`)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${booking.booking_ref}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-scale-in text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-50 text-success-700">
        <CheckCircle2 className="size-7" strokeWidth={2} aria-hidden />
      </span>

      <p className="mt-4 text-[1.0625rem] font-bold tracking-[-0.02em] text-ink-900">
        Booking confirmed
      </p>

      <div className="mt-5 rounded-card border border-saffron-200 bg-saffron-50 px-5 py-4">
        <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-saffron-700 uppercase">
          Booking ID
        </p>
        <p className="mt-1 font-mono text-[1.375rem] font-bold tracking-[-0.01em] text-ink-900">
          {booking.booking_ref}
        </p>
      </div>

      <dl className="card mt-4 divide-y divide-hairline overflow-hidden text-left">
        <Row label="Couple" value={couple} />
        <Row label="Pooja" value={booking.pooja_title} />
        <Row label="Date" value={formatFullDate(booking.pooja_date)} />
        <Row label="Time" value={formatTime(booking.start_time) ?? ""} />
        <Row label="Status" value="Confirmed" />
      </dl>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={share}
          className="press t-small inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2.5 font-semibold text-ink-700 hover:bg-ink-200"
        >
          <Share2 className="size-3.5" strokeWidth={2.2} aria-hidden />
          Share
        </button>

        <button
          type="button"
          onClick={addToCalendar}
          className="press t-small inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2.5 font-semibold text-ink-700 hover:bg-ink-200"
        >
          <CalendarPlus className="size-3.5" strokeWidth={2.2} aria-hidden />
          Add to calendar
        </button>

        <Link
          href="/book/lookup"
          className="press t-small inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2.5 font-semibold text-ink-700 hover:bg-ink-200"
        >
          <Ticket className="size-3.5" strokeWidth={2.2} aria-hidden />
          View booking
        </Link>
      </div>

      <p className="t-caption mt-4 text-ink-400">
        Please keep this booking ID. You can look it up or cancel any time using
        your booking ID and phone number.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="t-small text-ink-500">{label}</dt>
      <dd className="t-small text-right font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

/** "2026-08-25" + "09:00:00" -> "20260825T090000" (floating local time). */
function icsStamp(date: string, time: string, addMinutes = 0) {
  const [h, m] = (time || "09:00").split(":").map(Number);
  const base = new Date(`${date}T00:00:00`);
  base.setHours(h || 0, (m || 0) + addMinutes, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${base.getFullYear()}${pad(base.getMonth() + 1)}${pad(base.getDate())}` +
    `T${pad(base.getHours())}${pad(base.getMinutes())}00`
  );
}

function escapeIcs(value: string) {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function Field({
  label,
  value,
  onChange,
  required,
  hint,
  error,
  multiline,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  multiline?: boolean;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const className = cn(
    "w-full rounded-tile border bg-white px-3.5 text-[0.9375rem] text-ink-900 transition-colors",
    "placeholder:text-ink-300 focus:border-saffron-500 focus:outline-none",
    error ? "border-danger-500" : "border-ink-200",
  );

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700">
        {label}
        {required ? (
          <span className="ml-0.5 text-saffron-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          className={cn(className, "resize-y py-3 leading-relaxed")}
          placeholder={input.placeholder}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(className, "h-12")}
          {...input}
        />
      )}

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

/** Bottom sheet on mobile, side drawer on larger screens. */
function Sheet({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-ink-900/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative mt-auto flex max-h-[94dvh] w-full flex-col rounded-t-[1.5rem] bg-white sm:mt-0 sm:h-dvh sm:max-h-none sm:w-[28rem] sm:rounded-none"
      >
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="press grid size-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
            >
              <ChevronLeft className="size-[1.15rem]" strokeWidth={2.2} aria-hidden />
            </button>
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-saffron-50 text-saffron-600">
              <Users className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
          )}
          <h2 className="min-w-0 flex-1 truncate text-[1rem] font-semibold tracking-[-0.02em] text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press grid size-9 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="size-[1.1rem]" strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
