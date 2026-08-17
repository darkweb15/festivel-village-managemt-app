import {
  AlertTriangle,
  CalendarDays,
  Flame,
  Info,
  Pin,
  type LucideIcon,
} from "lucide-react";
import type { Announcement, AnnouncementCategory } from "@/lib/supabase/types";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { getDictionary } from "@/lib/i18n/server";
import { timeAgo } from "@/lib/utils";

/** Each category gets its own subtle icon tile, per the design brief. */
const CATEGORY: Record<
  AnnouncementCategory,
  { icon: LucideIcon; tile: string }
> = {
  pooja: { icon: Flame, tile: "bg-saffron-50 text-saffron-600" },
  events: { icon: CalendarDays, tile: "bg-info-50 text-info-700" },
  general: { icon: Info, tile: "bg-gold-100 text-gold-700" },
  important: { icon: AlertTriangle, tile: "bg-danger-50 text-danger-700" },
};

/** The announcement_category enum, in the reader's language. */
function categoryLabel(t: Dictionary, category: AnnouncementCategory) {
  if (category === "important") return t.common.important;
  return t.announcements[category];
}

export async function AnnouncementCard({
  announcement,
}: {
  announcement: Announcement;
}) {
  const t = await getDictionary();
  const { icon: Icon, tile } = CATEGORY[announcement.category];
  const label = categoryLabel(t, announcement.category);

  return (
    <article className="card card-interactive p-4">
      <div className="flex gap-3.5">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-tile ${tile}`}
        >
          <Icon className="size-[1.15rem]" strokeWidth={2} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[0.9375rem] leading-snug font-semibold text-ink-900">
              {announcement.title}
            </h3>
            {announcement.is_pinned ? (
              <Pin
                className="mt-0.5 size-3.5 shrink-0 text-saffron-600"
                strokeWidth={2.2}
                aria-label={t.common.pinned}
              />
            ) : null}
          </div>

          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-600">
            {announcement.body}
          </p>

          <div className="mt-2.5 flex items-center gap-2 text-[0.6875rem] text-ink-400">
            <span className="font-medium text-ink-500">{label}</span>
            <span aria-hidden>·</span>
            <time dateTime={announcement.published_at}>
              {timeAgo(announcement.published_at)}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}
