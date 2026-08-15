import { Suspense } from "react";
import type { Metadata } from "next";
import { Images } from "lucide-react";
import { TabHeader } from "@/components/layout/app-header";
import { GalleryGrid } from "@/components/gallery-grid";
import { FilterChips } from "@/components/ui/filter-chips";
import { SectionHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, SetupNotice, Skeleton } from "@/components/ui/states";
import { getGallery } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Gallery" };

const TABS = [
  { value: "photos", label: "Photos" },
  { value: "videos", label: "Videos" },
];

export default async function GalleryPage(props: PageProps<"/gallery">) {
  const params = await props.searchParams;
  const raw = params.tab;
  const tab = (Array.isArray(raw) ? raw[0] : raw) === "videos" ? "videos" : "photos";

  return (
    <>
      <TabHeader title="Gallery" subtitle="Moments from our mandapam" />

      <div className="space-y-6 px-5 py-5">
        <Suspense fallback={<div className="h-12 rounded-full bg-ink-100" />}>
          <FilterChips param="tab" options={TABS} defaultValue="photos" />
        </Suspense>

        <Suspense key={tab} fallback={<GallerySkeleton />}>
          <Media mediaType={tab === "videos" ? "video" : "photo"} />
        </Suspense>
      </div>
    </>
  );
}

async function Media({ mediaType }: { mediaType: "photo" | "video" }) {
  const result = await getGallery(mediaType);

  if (result.status === "unconfigured") return <SetupNotice what="the gallery" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Images className="size-5" aria-hidden />}
        title={mediaType === "photo" ? "No photos yet" : "No videos yet"}
        description="Festival media appears here as soon as the committee uploads it."
      />
    );
  }

  const highlights = result.data.filter((item) => item.is_highlight);
  const rest = result.data.filter((item) => !item.is_highlight);

  return (
    <div className="animate-rise space-y-7">
      {highlights.length > 0 ? (
        <section>
          <SectionHeader title="Highlights" />
          <GalleryGrid items={highlights} layout="grid" />
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section>
          <SectionHeader title="Festival Moments" />
          <GalleryGrid items={rest} layout="masonry" />
        </section>
      ) : null}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading gallery">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          className={i % 3 === 0 ? "aspect-[3/4] rounded-tile" : "aspect-square rounded-tile"}
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
