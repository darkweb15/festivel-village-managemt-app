import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarHeart, Clock, Info, Search, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { AvailabilityBadge } from "@/components/booking/availability-badge";
import { BookingFlow } from "@/components/booking/booking-flow";
import { buttonClasses } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getPoojaAvailability } from "@/lib/data/queries";
import type { PoojaAvailability } from "@/lib/supabase/types";
import { dayHeading, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Book a Pooja" };

// Availability changes as people book, so this screen is always fresh.
export const dynamic = "force-dynamic";

export default function BookPage() {
  return (
    <>
      <PageHeader title="Couple Pooja Booking" backHref="/" />

      <div className="space-y-5 px-5 py-5">
        <p className="text-[0.875rem] leading-relaxed text-ink-500">
          Book a dhampathula pooja slot for your family. Availability updates as
          other couples book.
        </p>

        <Suspense fallback={<SkeletonList count={3} />}>
          <BookableList />
        </Suspense>

        <Link
          href="/book/lookup"
          className={buttonClasses("secondary", "md", "w-full")}
        >
          <Search className="size-4" strokeWidth={2.2} aria-hidden />
          Find or cancel an existing booking
        </Link>
      </div>
    </>
  );
}

async function BookableList() {
  const result = await getPoojaAvailability();

  if (result.status === "unconfigured") return <SetupNotice what="pooja bookings" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  const bookable = result.data.filter(
    (p) => p.booking_enabled && p.max_couples > 0 && p.status === "scheduled",
  );

  if (bookable.length === 0) {
    return (
      <EmptyState
        icon={<CalendarHeart className="size-5" aria-hidden />}
        title="No poojas open for booking"
        description="The committee hasn't opened couple bookings yet. Please check back, or see the full pooja schedule."
        action={
          <Link href="/pooja" className={buttonClasses("secondary", "sm")}>
            View pooja schedule
          </Link>
        }
      />
    );
  }

  // Group by day so a reader scans dates first, then times within the day.
  const byDate = new Map<string, PoojaAvailability[]>();
  for (const pooja of bookable) {
    const bucket = byDate.get(pooja.pooja_date) ?? [];
    bucket.push(pooja);
    byDate.set(pooja.pooja_date, bucket);
  }

  return (
    <div className="animate-rise space-y-6">
      {[...byDate.entries()].map(([date, poojas]) => (
        <section key={date}>
          <div className="mb-2.5 flex items-baseline gap-2 px-1">
            <h2 className="t-h3 text-ink-900">{dayHeading(date).label}</h2>
            {dayHeading(date).sub ? (
              <span className="t-caption text-ink-400">{dayHeading(date).sub}</span>
            ) : null}
          </div>

          <div className="space-y-3">
            {poojas.map((pooja) => (
              <article key={pooja.pooja_id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[1rem] leading-snug font-semibold text-ink-900">
                      {pooja.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" strokeWidth={2} aria-hidden />
                        {formatTime(pooja.start_time)}
                        {pooja.end_time ? ` – ${formatTime(pooja.end_time)}` : ""}
                      </span>
                      {pooja.priest_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-3.5" strokeWidth={2} aria-hidden />
                          {pooja.priest_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <AvailabilityBadge pooja={pooja} className="shrink-0" />
                </div>

                {pooja.description ? (
                  <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-600">
                    {pooja.description}
                  </p>
                ) : null}

                {pooja.special_instructions ? (
                  <p className="mt-3 flex gap-2 rounded-tile bg-ink-50 p-3 text-[0.75rem] leading-relaxed text-ink-600">
                    <Info className="mt-px size-3.5 shrink-0 text-ink-400" strokeWidth={2} aria-hidden />
                    {pooja.special_instructions}
                  </p>
                ) : null}

                <div className="mt-4">
                  <BookingFlow pooja={pooja} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
