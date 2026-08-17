import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays, Music4 } from "lucide-react";
import { TabHeader } from "@/components/layout/app-header";
import { EventCard } from "@/components/event-card";
import { FilterChips } from "@/components/ui/filter-chips";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getCulturalEvents, getEvents } from "@/lib/data/queries";
import { getDictionary } from "@/lib/i18n/server";
import { formatDateBadge, formatTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.events.title };
}

export default async function EventsPage(props: PageProps<"/events">) {
  const params = await props.searchParams;
  const raw = params.tab;
  const scope = (Array.isArray(raw) ? raw[0] : raw) === "past" ? "past" : "upcoming";
  const t = await getDictionary();

  const TABS = [
    { value: "upcoming", label: t.events.upcoming },
    { value: "past", label: t.events.past },
  ];

  return (
    <>
      <TabHeader title={t.events.title} subtitle={t.events.subtitle} />

      <div className="space-y-6 px-5 py-5">
        <Suspense fallback={<div className="h-12 rounded-full bg-ink-100" />}>
          <FilterChips param="tab" options={TABS} defaultValue="upcoming" />
        </Suspense>

        <Suspense key={scope} fallback={<SkeletonList count={4} />}>
          <EventList scope={scope} />
        </Suspense>

        <Suspense fallback={null}>
          <CulturalPrograms />
        </Suspense>
      </div>
    </>
  );
}

async function EventList({ scope }: { scope: "upcoming" | "past" }) {
  const t = await getDictionary();
  const result = await getEvents(scope);

  if (result.status === "unconfigured") return <SetupNotice what="events" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-5" aria-hidden />}
        title={scope === "upcoming" ? t.events.noUpcoming : t.events.noPast}
        description={
          scope === "upcoming" ? t.events.noUpcomingBody : t.events.noPastBody
        }
      />
    );
  }

  return (
    // Same reasoning as the committee grid: the sidebar owns 256px from md,
    // so two columns only become comfortable at lg.
    <div className="animate-rise space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
      {result.data.map((event) => (
        <EventCard key={event.id} event={event} muted={scope === "past"} />
      ))}
    </div>
  );
}

/** Highlighted strip for cultural programs, called out separately in the brief. */
async function CulturalPrograms() {
  const t = await getDictionary();
  const result = await getCulturalEvents();
  if (result.status !== "ok" || result.data.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-card bg-saffron-600 text-white shadow-[0_12px_32px_-16px_rgba(234,83,8,0.7)]">
      <div className="flex items-center gap-3 px-5 pt-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-white/18">
          <Music4 className="size-[1.15rem]" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h2 className="text-[1rem] font-semibold tracking-[-0.02em]">
            {t.events.cultural}
          </h2>
          <p className="text-[0.75rem] text-white/75">
            {t.events.culturalBody}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-px bg-white/12">
        {result.data.map((event) => {
          const { day, month } = formatDateBadge(event.event_date);
          const time = formatTime(event.start_time);
          return (
            <li
              key={event.id}
              className="flex items-center gap-3.5 bg-saffron-600 px-5 py-3.5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-white/15">
                <span className="text-[0.9375rem] leading-none font-bold">{day}</span>
                <span className="mt-0.5 text-[0.5625rem] leading-none font-semibold tracking-[0.08em]">
                  {month}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold">{event.title}</p>
                <p className="truncate text-[0.75rem] text-white/75">
                  {[event.day_part, time].filter(Boolean).join(" ") || t.events.timeTba}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
