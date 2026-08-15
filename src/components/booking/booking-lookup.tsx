"use client";

import { useActionState, useId, useState } from "react";
import { CalendarX2, CheckCircle2, Loader2, Search, Ticket } from "lucide-react";
import { cancelBooking, lookupBooking } from "@/app/(app)/book/actions";
import { Button } from "@/components/ui/button";
import { EMPTY_LOOKUP_STATE, type BookingLookupState } from "@/lib/form-state";
import { cn, formatFullDate, formatTime } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-success-50 text-success-700",
  pending: "bg-gold-100 text-gold-700",
  cancelled: "bg-danger-50 text-danger-700",
  rescheduled: "bg-info-50 text-info-700",
  completed: "bg-ink-100 text-ink-600",
  no_show: "bg-ink-100 text-ink-600",
};

/**
 * Find or cancel a booking. Both operations require the booking reference AND
 * the phone number it was made with, so a leaked reference on its own reveals
 * nothing.
 */
export function BookingLookup() {
  const [state, action, pending] = useActionState<BookingLookupState, FormData>(
    lookupBooking,
    EMPTY_LOOKUP_STATE,
  );
  const [cancelState, cancelAction, cancelling] = useActionState<
    BookingLookupState,
    FormData
  >(cancelBooking, EMPTY_LOOKUP_STATE);

  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [confirming, setConfirming] = useState(false);

  const refId = useId();
  const phoneId = useId();

  const cancelled = cancelState.status === "cancelled";
  const booking = state.booking;

  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-4 p-5">
        <div>
          <label
            htmlFor={refId}
            className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700"
          >
            Booking ID
          </label>
          <input
            id={refId}
            name="booking_ref"
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase())}
            placeholder="SK2026-0042"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-tile border border-ink-200 bg-white px-3.5 font-mono text-[0.9375rem] tracking-wide text-ink-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-300 focus:border-saffron-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={phoneId}
            className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700"
          >
            Phone number used for the booking
          </label>
          <input
            id={phoneId}
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91"
            inputMode="tel"
            autoComplete="tel"
            className="h-12 w-full rounded-tile border border-ink-200 bg-white px-3.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-300 focus:border-saffron-500 focus:outline-none"
          />
        </div>

        {state.status === "error" && state.message ? (
          <p
            role="alert"
            className="rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] text-danger-700"
          >
            {state.message}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Looking up…
            </>
          ) : (
            <>
              <Search className="size-4" strokeWidth={2.2} aria-hidden />
              Find my booking
            </>
          )}
        </Button>
      </form>

      {booking ? (
        <div className="card animate-rise overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-50 text-saffron-600">
              <Ticket className="size-[1.1rem]" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.9375rem] font-bold text-ink-900">
                {booking.booking_ref}
              </p>
              <p className="text-[0.75rem] text-ink-500">{booking.pooja_title}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.04em] uppercase",
                STATUS_TONE[cancelled ? "cancelled" : booking.status] ??
                  "bg-ink-100 text-ink-600",
              )}
            >
              {cancelled ? "cancelled" : booking.status.replace("_", " ")}
            </span>
          </div>

          <dl className="divide-y divide-hairline">
            <Row
              label="Couple"
              value={[booking.partner1_name, booking.partner2_name]
                .filter(Boolean)
                .join(" & ")}
            />
            {booking.gotram ? <Row label="Gotram" value={booking.gotram} /> : null}
            <Row label="Date" value={formatFullDate(booking.pooja_date)} />
            <Row
              label="Time"
              value={
                [formatTime(booking.start_time), booking.end_time ? formatTime(booking.end_time) : null]
                  .filter(Boolean)
                  .join(" – ") || ""
              }
            />
          </dl>

          {booking.special_instructions ? (
            <p className="border-t border-hairline px-5 py-4 text-[0.8125rem] leading-relaxed text-ink-600">
              {booking.special_instructions}
            </p>
          ) : null}

          {cancelled ? (
            <p className="flex items-center gap-2 border-t border-hairline bg-success-50 px-5 py-4 text-[0.8125rem] font-medium text-success-700">
              <CheckCircle2 className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
              {cancelState.message}
            </p>
          ) : booking.status === "confirmed" || booking.status === "pending" ? (
            <div className="border-t border-hairline px-5 py-4">
              {cancelState.status === "error" ? (
                <p
                  role="alert"
                  className="mb-3 rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] text-danger-700"
                >
                  {cancelState.message}
                </p>
              ) : null}

              {confirming ? (
                <form action={cancelAction} className="space-y-3">
                  <input type="hidden" name="booking_ref" value={booking.booking_ref} />
                  <input type="hidden" name="phone" value={phone} />
                  <p className="text-[0.8125rem] leading-relaxed text-ink-600">
                    Cancel this booking and free the slot for another couple?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirming(false)}
                    >
                      Keep it
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="flex-1"
                      loading={cancelling}
                      loadingLabel="Cancelling…"
                    >
                      Cancel booking
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="press inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-danger-700 hover:text-danger-500"
                >
                  <CalendarX2 className="size-4" strokeWidth={2.2} aria-hidden />
                  Cancel this booking
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="text-[0.8125rem] text-ink-500">{label}</dt>
      <dd className="text-right text-[0.8125rem] font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
