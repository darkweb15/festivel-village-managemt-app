import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarClock, Images } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AskAiCard } from "@/components/ai/ask-ai-card";
import { FestivalPulse } from "@/components/home/festival-pulse";
import { HeroFestivalCard } from "@/components/hero-festival-card";
import { DonationOverviewCard } from "@/components/donation-card";
import { GalleryStrip } from "@/components/home/gallery-strip";
import { ScheduleRow } from "@/components/event-card";
import { SectionHeader } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  Skeleton,
  SkeletonList,
} from "@/components/ui/states";
import {
  getAnnouncements,
  getFestivalPulse,
  getFestivalSettings,
  getGallery,
  getPublicStats,
  getScheduleFeed,
} from "@/lib/data/queries";
import { festivalToday, isWithinHours, relativeDayLabel } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<AppHeader />}>
        <HeaderSlot />
      </Suspense>

      <div className="animate-rise space-y-7 px-5 py-5">
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSlot />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-40 w-full rounded-card" />}>
          <PulseSlot />
        </Suspense>

        <section>
          <SectionHeader
            title="Today’s Schedule"
            action={<SeeAll href="/pooja" label="See all" />}
          />
          <Suspense fallback={<SkeletonList count={2} />}>
            <ScheduleSlot />
          </Suspense>
        </section>

        <section>
          <SectionHeader
            title="Festival Fund"
            action={<SeeAll href="/donate" label="Details" />}
          />
          <Suspense fallback={<Skeleton className="h-44 w-full rounded-card" />}>
            <DonationsSlot />
          </Suspense>
        </section>

        <Suspense fallback={null}>
          <MemoriesSlot />
        </Suspense>

        <AskAiCard />
      </div>
    </>
  );
}

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="t-small group inline-flex items-center gap-1 font-semibold text-saffron-700 hover:text-saffron-800"
    >
      {label}
      <ArrowRight
        className="size-3.5 transition-transform duration-[--duration-fast] group-hover:translate-x-0.5"
        strokeWidth={2.4}
        aria-hidden
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */

async function HeaderSlot() {
  const announcements = await getAnnouncements(undefined, 1);
  const latest = announcements.data[0];

  return (
    <AppHeader hasNewAnnouncements={isWithinHours(latest?.published_at, 48)} />
  );
}

async function HeroSlot() {
  const settings = await getFestivalSettings();
  return <HeroFestivalCard settings={settings.data} />;
}

async function PulseSlot() {
  const pulse = await getFestivalPulse();

  if (pulse.status === "unconfigured") return <SetupNotice what="live festival status" />;
  if (pulse.status === "error") return <ErrorState message={pulse.message} />;

  return <FestivalPulse pulse={pulse.data} />;
}

async function ScheduleSlot() {
  const feed = await getScheduleFeed(6);

  if (feed.status === "unconfigured") return <SetupNotice what="the schedule" />;
  if (feed.status === "error") return <ErrorState message={feed.message} />;

  const todayKey = festivalToday();
  const todays = feed.data.filter((entry) => entry.date === todayKey);
  const shown = todays.length > 0 ? todays : feed.data.slice(0, 3);

  if (shown.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="size-5" aria-hidden />}
        title="Nothing scheduled yet"
        description="Pooja timings and events appear here once the committee publishes them."
      />
    );
  }

  return (
    <div className="space-y-3">
      {todays.length === 0 ? (
        <p className="t-caption px-1 text-ink-400">
          Nothing today — here’s what’s next.
        </p>
      ) : null}
      {shown.map((entry) => (
        <ScheduleRow
          key={entry.id}
          title={entry.title}
          kind={entry.kind}
          time={entry.time}
          relative={relativeDayLabel(entry.date)}
        />
      ))}
    </div>
  );
}

async function DonationsSlot() {
  const stats = await getPublicStats();

  if (stats.status === "unconfigured") return <SetupNotice what="donation totals" />;
  if (stats.status === "error") return <ErrorState message={stats.message} />;

  return (
    <DonationOverviewCard
      total={stats.data.total_donations}
      goal={stats.data.donation_goal}
      action="view"
    />
  );
}

async function MemoriesSlot() {
  const gallery = await getGallery("photo");
  if (gallery.status !== "ok") return null;

  const items = gallery.data.slice(0, 6);

  return (
    <section>
      <SectionHeader
        title="Festival Memories"
        action={<SeeAll href="/gallery" label="Gallery" />}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Images className="size-5" aria-hidden />}
          title="No photos yet"
          description="Photos from the mandapam will appear here during the festival."
        />
      ) : (
        <GalleryStrip items={items} />
      )}
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 px-5 pt-5 pb-6">
        <Skeleton className="mx-auto h-3 w-40" />
        <Skeleton className="mx-auto h-8 w-56" />
        <Skeleton className="mx-auto h-3 w-64" />
        <Skeleton className="mt-4 h-13 w-full rounded-full" />
        <Skeleton className="h-13 w-full rounded-full" />
      </div>
    </div>
  );
}
