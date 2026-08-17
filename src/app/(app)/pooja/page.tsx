import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Flame, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { buttonClasses } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getPoojaAvailability } from "@/lib/data/queries";
import type { PoojaAvailability } from "@/lib/supabase/types";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { cn, dayHeading, festivalToday, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.pooja.title };
}

export default async function PoojaPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.pooja.title} backHref="/" />

      <div className="px-5 py-5">
        <Suspense fallback={<SkeletonList count={5} />}>
          <Timeline />
        </Suspense>
      </div>
    </>
  );
}

async function Timeline() {
  const t = await getDictionary();
  const result = await getPoojaAvailability();

  if (result.status === "unconfigured") return <SetupNotice what="pooja timings" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Flame className="size-5" aria-hidden />}
        title={t.pooja.noTimings}
        description={t.pooja.noTimingsBody}
      />
    );
  }

  const today = festivalToday();
  const byDate = new Map<string, PoojaAvailability[]>();
  for (const slot of result.data) {
    const bucket = byDate.get(slot.pooja_date) ?? [];
    bucket.push(slot);
    byDate.set(slot.pooja_date, bucket);
  }

  return (
    <div className="animate-rise space-y-7">
      {[...byDate.entries()].map(([date, slots]) => (
        <section key={date}>
          <DayHeading date={date} />

          {/* The rail is a single continuous line; each entry hangs a dot on it. */}
          <ol className="relative ml-[3.75rem] border-l border-hairline">
            {slots.map((slot, index) => (
              <TimelineRow
                key={slot.pooja_id}
                t={t}
                slot={slot}
                isFirst={index === 0}
                isToday={date === today}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function DayHeading({ date }: { date: string }) {
  const { label, sub } = dayHeading(date);
  return (
    <div className="mb-3 flex items-baseline gap-2 px-1">
      <h2 className="t-label text-saffron-700">{label}</h2>
      {sub ? <span className="t-caption text-ink-400">{sub}</span> : null}
    </div>
  );
}

function TimelineRow({
  t,
  slot,
  isFirst,
  isToday,
}: {
  t: Dictionary;
  slot: PoojaAvailability;
  isFirst: boolean;
  isToday: boolean;
}) {
  const takesBookings = slot.booking_enabled && slot.max_couples > 0;
  const full = takesBookings && slot.available === 0;

  return (
    <li className={cn("relative pl-5", isFirst ? "pb-4" : "py-4 pt-0")}>
      {/* Time sits outside the rail so every row lines up on the same column. */}
      <span className="t-caption absolute -left-[3.75rem] top-0 w-[3.25rem] text-right font-semibold tabular-nums text-ink-500">
        {formatTime(slot.start_time)}
      </span>

      <span
        aria-hidden
        className={cn(
          "absolute -left-[0.3125rem] top-1 size-2.5 rounded-full ring-4 ring-white",
          full
            ? "bg-danger-500"
            : takesBookings
              ? "bg-success-500"
              : isToday
                ? "bg-saffron-500"
                : "bg-ink-300",
        )}
      />

      <div className="card card-interactive p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="t-h3 text-ink-900">{slot.title}</h3>
            {slot.priest_name ? (
              <p className="t-caption mt-1 inline-flex items-center gap-1.5 text-ink-500">
                <UserRound className="size-3.5" strokeWidth={2} aria-hidden />
                {slot.priest_name}
              </p>
            ) : null}
          </div>

          {takesBookings ? (
            <span
              className={cn(
                "t-caption shrink-0 rounded-full px-2.5 py-1 font-semibold tabular-nums",
                full
                  ? "bg-danger-50 text-danger-700"
                  : "bg-success-50 text-success-700",
              )}
            >
              {full
                ? t.pooja.fullyBooked
                : fmt(t.pooja.available, { n: slot.available })}
            </span>
          ) : null}
        </div>

        {slot.description ? (
          <p className="t-small mt-2.5 text-ink-600">{slot.description}</p>
        ) : null}

        {takesBookings ? (
          <>
            <p className="t-caption mt-3 text-ink-400 tabular-nums">
              {fmt(t.pooja.coupsBooked, {
                booked: slot.booked,
                total: slot.max_couples,
              })}
            </p>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200"
              role="progressbar"
              aria-valuenow={slot.booked}
              aria-valuemin={0}
              aria-valuemax={slot.max_couples}
              aria-label={fmt(t.pooja.coupsBooked, {
                booked: slot.booked,
                total: slot.max_couples,
              })}
            >
              <div
                className={cn(
                  "progress-fill h-full rounded-full",
                  full ? "bg-danger-500" : "bg-saffron-500",
                )}
                style={
                  {
                    "--pct": `${Math.round((slot.booked / Math.max(slot.max_couples, 1)) * 100)}%`,
                  } as React.CSSProperties
                }
              />
            </div>

            {slot.is_bookable ? (
              <Link
                href="/book"
                className={buttonClasses("tertiary", "sm", "mt-3.5 w-full")}
              >
                {t.pooja.bookThis}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}
