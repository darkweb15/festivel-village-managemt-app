import { Clock, MapPin } from "lucide-react";
import type { FestivalEvent } from "@/lib/supabase/types";
import { getDictionary } from "@/lib/i18n/server";
import { cn, formatDateBadge, formatTime } from "@/lib/utils";

/**
 * Event row with the two-line date badge on the left.
 * Used on Home (compact) and on the Events screen (full).
 */
export async function EventCard({
  event,
  muted = false,
}: {
  event: FestivalEvent;
  /** Past events render de-emphasised. */
  muted?: boolean;
}) {
  const t = await getDictionary();
  const { day, month } = formatDateBadge(event.event_date);
  const time = formatTime(event.start_time);
  const timing = [event.day_part, time].filter(Boolean).join(" ");

  return (
    <article
      id={`event-${event.id}`}
      className={cn(
        "card card-interactive scroll-mt-24 p-3.5",
        muted && "opacity-70",
      )}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={cn(
            "grid size-[3.25rem] shrink-0 place-items-center rounded-tile",
            muted ? "bg-ink-100 text-ink-500" : "bg-saffron-50 text-saffron-700",
          )}
        >
          <span className="text-[1.0625rem] leading-none font-bold tracking-[-0.02em]">
            {day}
          </span>
          <span className="mt-0.5 text-[0.625rem] leading-none font-semibold tracking-[0.08em]">
            {month}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] leading-snug font-semibold text-ink-900">
            {event.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-500">
            {timing ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" strokeWidth={2} aria-hidden />
                {timing}
              </span>
            ) : null}
            {event.venue ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="truncate">{event.venue}</span>
              </span>
            ) : null}
          </div>
        </div>

        {event.is_featured && !muted ? (
          <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-1 text-[0.625rem] font-semibold text-gold-700">
            {t.events.featured}
          </span>
        ) : null}
      </div>

      {event.description ? (
        <p className="mt-3 border-t border-hairline pt-3 text-[0.8125rem] leading-relaxed text-ink-600">
          {event.description}
        </p>
      ) : null}
    </article>
  );
}

/** Compact variant for the Home "Today's Schedule" strip. */
export function ScheduleRow({
  title,
  kind,
  time,
  relative,
}: {
  title: string;
  kind: string;
  time: string | null;
  relative: string;
}) {
  return (
    <article className="card card-interactive flex items-center gap-3.5 p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-saffron-50 text-saffron-600">
        <Clock className="size-[1.15rem]" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[0.9375rem] font-semibold text-ink-900">
          {title}
        </h3>
        <p className="mt-0.5 text-[0.75rem] text-ink-500">
          {relative}
          {time ? ` · ${formatTime(time)}` : ""}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.04em] text-ink-500 uppercase">
        {kind}
      </span>
    </article>
  );
}
