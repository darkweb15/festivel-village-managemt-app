"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  CheckCheck,
  Loader2,
  Phone,
  UserX,
  X,
} from "lucide-react";
import { rescheduleBooking, setBookingStatus } from "@/app/admin/bookings-actions";
import { EmptyState } from "@/components/ui/states";
import type { BookingStatus } from "@/lib/supabase/types";
import { cn, formatFullDate, formatTime } from "@/lib/utils";

export type AdminBookingRow = {
  id: string;
  booking_ref: string;
  partner1_name: string;
  partner2_name: string | null;
  gotram: string | null;
  phone: string;
  status: BookingStatus;
  source: string;
  created_at: string;
  pooja: { id: string; title: string; pooja_date: string; start_time: string } | null;
};

const STATUS_TONE: Record<BookingStatus, string> = {
  confirmed: "bg-success-50 text-success-700",
  pending: "bg-gold-100 text-gold-700",
  cancelled: "bg-danger-50 text-danger-700",
  rescheduled: "bg-info-50 text-info-700",
  completed: "bg-ink-100 text-ink-600",
  no_show: "bg-ink-200 text-ink-700",
};

export function BookingTable({
  bookings,
  poojaOptions,
}: {
  bookings: AdminBookingRow[];
  poojaOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  function change(id: string, status: BookingStatus) {
    startTransition(async () => {
      const result = await setBookingStatus(id, status);
      setNotice(result.message);
      if (result.ok) router.refresh();
    });
  }

  function move(id: string) {
    startTransition(async () => {
      const result = await rescheduleBooking(id, target);
      setNotice(result.message);
      setRescheduling(null);
      setTarget("");
      if (result.ok) router.refresh();
    });
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="size-5" aria-hidden />}
        title="No bookings match these filters"
        description="Try a different date, pooja or status."
      />
    );
  }

  return (
    <>
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-tile bg-success-50 px-3.5 py-2.5 text-[0.8125rem] font-medium text-success-700"
        >
          {notice}
        </p>
      ) : null}

      <ul className={cn("card divide-y divide-hairline overflow-hidden", pending && "opacity-70")}>
        {bookings.map((b) => {
          const couple = [b.partner1_name, b.partner2_name].filter(Boolean).join(" & ");
          const open = b.status === "confirmed" || b.status === "pending" || b.status === "rescheduled";

          return (
            <li key={b.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.75rem] font-semibold text-saffron-700">
                      {b.booking_ref}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.04em] uppercase",
                        STATUS_TONE[b.status],
                      )}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                    {b.source === "ai_agent" ? (
                      <span className="rounded-full bg-info-50 px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.04em] text-info-700 uppercase">
                        via AI
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 text-[0.9375rem] font-semibold text-ink-900">
                    {couple}
                  </p>

                  <p className="mt-0.5 text-[0.75rem] text-ink-500">
                    {b.pooja ? (
                      <>
                        {b.pooja.title} · {formatFullDate(b.pooja.pooja_date)} ·{" "}
                        {formatTime(b.pooja.start_time)}
                      </>
                    ) : (
                      "Pooja removed"
                    )}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-400">
                    <a
                      href={`tel:${b.phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-medium text-ink-600 hover:text-saffron-700"
                    >
                      <Phone className="size-3.5" strokeWidth={2} aria-hidden />
                      {b.phone}
                    </a>
                    {b.gotram ? <span>Gotram: {b.gotram}</span> : null}
                  </div>
                </div>

                {open ? (
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {b.status !== "confirmed" ? (
                      <Action label="Confirm" tone="success" onClick={() => change(b.id, "confirmed")}>
                        <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
                      </Action>
                    ) : null}
                    <Action label="Complete" tone="neutral" onClick={() => change(b.id, "completed")}>
                      <CheckCheck className="size-3.5" strokeWidth={2.2} aria-hidden />
                    </Action>
                    <Action label="No-show" tone="neutral" onClick={() => change(b.id, "no_show")}>
                      <UserX className="size-3.5" strokeWidth={2.2} aria-hidden />
                    </Action>
                    <Action
                      label="Reschedule"
                      tone="neutral"
                      onClick={() => {
                        setRescheduling(rescheduling === b.id ? null : b.id);
                        setTarget("");
                      }}
                    >
                      <CalendarClock className="size-3.5" strokeWidth={2.2} aria-hidden />
                    </Action>
                    <Action label="Cancel" tone="danger" onClick={() => change(b.id, "cancelled")}>
                      <X className="size-3.5" strokeWidth={2.4} aria-hidden />
                    </Action>
                  </div>
                ) : null}
              </div>

              {rescheduling === b.id ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-tile bg-ink-50 p-3">
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    aria-label="Move booking to"
                    className="h-10 min-w-0 flex-1 rounded-tile border border-ink-200 bg-white px-3 text-[0.8125rem] text-ink-900 focus:border-saffron-500 focus:outline-none"
                  >
                    <option value="">Choose the new pooja…</option>
                    {poojaOptions
                      .filter((o) => o.value !== b.pooja?.id)
                      .map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!target || pending}
                    onClick={() => move(b.id)}
                    className="press rounded-full bg-saffron-600 px-3.5 py-2 text-[0.75rem] font-semibold text-white disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      "Move booking"
                    )}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Action({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: "success" | "danger" | "neutral";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones = {
    success: "text-ink-500 hover:bg-success-50 hover:text-success-700",
    danger: "text-ink-500 hover:bg-danger-50 hover:text-danger-700",
    neutral: "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "press inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1.5 text-[0.6875rem] font-semibold transition-colors",
        tones[tone],
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
