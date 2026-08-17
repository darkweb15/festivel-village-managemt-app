import Link from "next/link";
import { ArrowRight, CalendarDays, Megaphone, Radio, Sparkles } from "lucide-react";
import type { FestivalPulse as Pulse } from "@/lib/data/queries";
import { getDictionary } from "@/lib/i18n/server";
import { plural } from "@/lib/i18n/format";
import { cn, formatTime, relativeDayLabel } from "@/lib/utils";

/**
 * Live festival status.
 *
 * Every line is database-backed and each one is omitted entirely when the
 * committee hasn't published it — an empty Pulse is better than an invented one.
 */
export async function FestivalPulse({ pulse }: { pulse: Pulse }) {
  const t = await getDictionary();
  const { nextPooja, nextEvent, topAnnouncement, hasLiveStream } = pulse;

  if (!nextPooja && !nextEvent && !topAnnouncement) return null;

  return (
    <section
      aria-labelledby="pulse-heading"
      className="card overflow-hidden bg-gradient-to-b from-saffron-50/70 to-white"
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full rounded-full bg-success-500 opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-success-500" />
        </span>
        <h2 id="pulse-heading" className="t-label text-saffron-700">
          {t.home.pulseHeading}
        </h2>
      </div>

      <ul className="divide-y divide-hairline/70 border-t border-hairline/70">
        {nextPooja ? (
          <li>
            <Link
              href="/book"
              className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-saffron-50/60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-saffron-100 text-saffron-700">
                <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-h3 block truncate text-ink-900">
                  {nextPooja.title}
                </span>
                <span className="t-caption mt-0.5 block text-ink-500">
                  {relativeDayLabel(nextPooja.date)} · {formatTime(nextPooja.startTime)}
                </span>
              </span>
              {nextPooja.capacity > 0 ? (
                <span
                  className={cn(
                    "t-caption shrink-0 rounded-full px-2.5 py-1 font-semibold tabular-nums",
                    nextPooja.available === 0
                      ? "bg-danger-50 text-danger-700"
                      : nextPooja.isBookable
                        ? "bg-success-50 text-success-700"
                        : "bg-ink-100 text-ink-500",
                  )}
                >
                  {nextPooja.available === 0
                    ? t.home.full
                    : plural(
                        nextPooja.available,
                        t.home.slotsOne,
                        t.home.slotsMany,
                      )}
                </span>
              ) : null}
            </Link>
          </li>
        ) : null}

        {nextEvent ? (
          <li>
            <Link
              href="/events"
              className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-saffron-50/60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-info-50 text-info-700">
                <CalendarDays className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-h3 block truncate text-ink-900">
                  {nextEvent.title}
                </span>
                <span className="t-caption mt-0.5 block text-ink-500">
                  {t.home.nextEvent} · {relativeDayLabel(nextEvent.date)}
                  {nextEvent.startTime ? ` · ${formatTime(nextEvent.startTime)}` : ""}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-ink-300"
                strokeWidth={2.2}
                aria-hidden
              />
            </Link>
          </li>
        ) : null}

        {topAnnouncement ? (
          <li>
            <Link
              href="/announcements"
              className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-saffron-50/60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-gold-100 text-gold-700">
                <Megaphone className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-h3 block truncate text-ink-900">
                  {topAnnouncement.title}
                </span>
                <span className="t-caption mt-0.5 block text-ink-500">
                  {t.home.latestAnnouncement}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-ink-300"
                strokeWidth={2.2}
                aria-hidden
              />
            </Link>
          </li>
        ) : null}

        {hasLiveStream ? (
          <li>
            <Link
              href="/live"
              className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-saffron-50/60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-danger-50 text-danger-700">
                <Radio className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                {/* Never says LIVE — only the player on /live can know that. */}
                <span className="t-h3 block text-ink-900">{t.nav.live}</span>
                <span className="t-caption mt-0.5 block text-ink-500">
                  {t.home.openStream}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-ink-300"
                strokeWidth={2.2}
                aria-hidden
              />
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
