import { Suspense } from "react";
import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { AnnouncementCard } from "@/components/announcement-card";
import { FilterChips } from "@/components/ui/filter-chips";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getAnnouncements } from "@/lib/data/queries";
import type { AnnouncementCategory } from "@/lib/supabase/types";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.announcements.title };
}

const VALID = new Set<AnnouncementCategory>(["pooja", "events", "general"]);

export default async function AnnouncementsPage(
  props: PageProps<"/announcements">,
) {
  const params = await props.searchParams;
  const raw = params.category;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const category =
    value && VALID.has(value as AnnouncementCategory)
      ? (value as AnnouncementCategory)
      : undefined;

  const t = await getDictionary();
  const FILTERS = [
    { value: "all", label: t.announcements.all },
    { value: "pooja", label: t.announcements.pooja },
    { value: "events", label: t.announcements.events },
    { value: "general", label: t.announcements.general },
  ];

  return (
    <>
      <PageHeader title={t.announcements.title} backHref="/" />

      <div className="space-y-5 px-5 py-5">
        <Suspense fallback={<div className="h-10 rounded-full bg-ink-100" />}>
          <FilterChips
            param="category"
            options={FILTERS}
            defaultValue="all"
            variant="pills"
          />
        </Suspense>

        <Suspense key={category ?? "all"} fallback={<SkeletonList count={4} />}>
          <Feed category={category} />
        </Suspense>
      </div>
    </>
  );
}

async function Feed({ category }: { category?: AnnouncementCategory }) {
  const t = await getDictionary();
  const result = await getAnnouncements(category);

  if (result.status === "unconfigured") return <SetupNotice what="announcements" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone className="size-5" aria-hidden />}
        title={t.announcements.empty}
        description={
          category ? t.announcements.emptyCategory : t.announcements.emptyAll
        }
      />
    );
  }

  return (
    <div className="animate-rise space-y-3">
      {result.data.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </div>
  );
}
