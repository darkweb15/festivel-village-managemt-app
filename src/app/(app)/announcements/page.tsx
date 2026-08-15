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

export const metadata: Metadata = { title: "Announcements" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pooja", label: "Pooja" },
  { value: "events", label: "Events" },
  { value: "general", label: "General" },
];

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

  return (
    <>
      <PageHeader title="Announcements" backHref="/" />

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
  const result = await getAnnouncements(category);

  if (result.status === "unconfigured") return <SetupNotice what="announcements" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone className="size-5" aria-hidden />}
        title="Nothing announced yet"
        description={
          category
            ? "There are no announcements in this category right now."
            : "Committee updates will appear here."
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
