import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { fmt } from "@/lib/i18n/format";
import type { NotificationKind, PublicNotification } from "@/lib/supabase/types";
import { formatShortDate, formatTime } from "@/lib/utils";

/**
 * Turning a stored notification into the sentence a reader sees.
 *
 * The database keeps two different kinds of text apart, and so does this:
 *
 *   subject/detail — the committee's own words, in whatever language they were
 *                    typed. Never translated, never reworded.
 *   meta           — structured facts (a date, a time, what changed), which the
 *                    app phrases in the reader's language from the dictionary.
 *
 * That split is why switching to Telugu changes "Pooja timing changed" but
 * leaves the pooja's own title exactly as the committee wrote it.
 */

export type NotificationView = {
  /** Framing line above the subject: what kind of change this is. */
  label: string;
  /** When the thing now happens, e.g. "Now 25 Aug 2026 at 06:30 PM". */
  timing: string | null;
  /** For a reschedule: where it used to be. */
  previously: string | null;
  /** Drives the icon and colour; `notice` is deliberately louder than the rest. */
  kind: NotificationKind;
};

/** Composes "{date} at {time}" or just the date, in the reader's language. */
function dateTime(
  t: Dictionary,
  date: string | undefined,
  time: string | null | undefined,
): string | null {
  if (!date) return null;
  const day = formatShortDate(date);
  const clock = formatTime(time ?? null);
  return clock
    ? fmt(t.notifications.onDate, { date: day, time: clock })
    : fmt(t.notifications.onDateOnly, { date: day });
}

export function describeNotification(
  t: Dictionary,
  notification: PublicNotification,
): NotificationView {
  const meta = notification.meta ?? {};
  const rescheduled = meta.reason === "rescheduled";
  const date = meta.pooja_date ?? meta.event_date;

  const label = (() => {
    switch (notification.kind) {
      case "notice":
        return t.notifications.kindNotice;
      case "pooja":
        return rescheduled
          ? t.notifications.poojaRescheduled
          : t.notifications.poojaAdded;
      case "event":
        return rescheduled
          ? t.notifications.eventRescheduled
          : t.notifications.eventAdded;
      default:
        return t.notifications.kindAnnouncement;
    }
  })();

  // A reschedule leads with where it moved to; anything else simply states when
  // it is. Both read as one line, so the card never grows a second paragraph.
  const timing = (() => {
    if (!date) return null;
    if (!rescheduled) return dateTime(t, date, meta.start_time);
    const day = formatShortDate(date);
    const clock = formatTime(meta.start_time ?? null);
    return clock
      ? fmt(t.notifications.movedTo, { date: day, time: clock })
      : fmt(t.notifications.movedToDateOnly, { date: day });
  })();

  const previously = (() => {
    if (!rescheduled || !meta.previous_date) return null;
    const before = dateTime(t, meta.previous_date, meta.previous_time);
    return before ? fmt(t.notifications.previously, { date: before }) : null;
  })();

  return { label, timing, previously, kind: notification.kind };
}
