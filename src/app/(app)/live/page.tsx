import { Suspense } from "react";
import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { EmptyState, ErrorState, SetupNotice, Skeleton } from "@/components/ui/states";
import { getFestivalSettings } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Live Darshan" };

/** Only well-known embed hosts are accepted, so a bad settings value can't
 *  turn this page into an open iframe for arbitrary content. */
function toEmbed(url: string): string | null {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?rel=0`;

  const channelLive = url.match(/youtube\.com\/@([\w.-]+)\/live/);
  if (channelLive) return null; // needs a video id; committee should paste the video link

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  const facebook = url.match(/facebook\.com\/.+\/videos\/\d+/);
  if (facebook) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
  }

  return null;
}

export default function LivePage() {
  return (
    <>
      <PageHeader title="Live Darshan" />

      <div className="px-5 py-5">
        <Suspense fallback={<Skeleton className="aspect-video w-full rounded-card" />}>
          <Stream />
        </Suspense>
      </div>
    </>
  );
}

async function Stream() {
  const result = await getFestivalSettings();

  if (result.status === "unconfigured") return <SetupNotice what="the live stream" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  const url = result.data?.live_darshan_url;
  const embed = url ? toEmbed(url) : null;

  if (!embed) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<Radio className="size-5" aria-hidden />}
          title="Darshan is not live right now"
          description={
            url
              ? "The stream link needs to be a YouTube, Vimeo or Facebook video URL."
              : "The committee will publish the live stream link when darshan begins."
          }
        />
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-1 text-center text-[0.8125rem] font-semibold text-saffron-700 underline underline-offset-4"
          >
            Open the link directly
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-4">
      <div className="card overflow-hidden">
        <div className="aspect-video w-full bg-ink-900">
          <iframe
            src={embed}
            title="Live darshan"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full border-0"
          />
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger-500 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-danger-500" />
          </span>
          <p className="text-[0.8125rem] font-medium text-ink-700">
            Live from the mandapam
          </p>
        </div>
      </div>

      <p className="px-1 text-[0.75rem] leading-relaxed text-ink-400">
        The stream is hosted on the committee&rsquo;s own channel. If it hasn&rsquo;t
        started yet, the player will show a countdown.
      </p>
    </div>
  );
}
