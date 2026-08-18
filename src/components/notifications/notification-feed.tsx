"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCheck,
  Flame,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { plural } from "@/lib/i18n/format";
import { describeNotification } from "@/lib/notifications/present";
import { seedReadState, useUnread } from "@/lib/notifications/read-state";
import type { NotificationKind, PublicNotification } from "@/lib/supabase/types";
import { cn, festivalToday, istDay, timeAgo } from "@/lib/utils";

/**
 * The notification centre.
 *
 * A client component for one reason: whether something is unread is a fact
 * about this device, not about the database (see `read-state.ts`). Everything
 * else — the rows themselves, their order, their text — is server-rendered data
 * handed down as a prop, so the list is complete and readable on first paint
 * and hydration only decides which entries get a dot.
 */

const KIND: Record<NotificationKind, { icon: LucideIcon; tile: string }> = {
  announcement: { icon: Megaphone, tile: "bg-info-50 text-info-700" },
  notice: { icon: AlertTriangle, tile: "bg-danger-50 text-danger-700" },
  pooja: { icon: Flame, tile: "bg-saffron-50 text-saffron-600" },
  event: { icon: CalendarDays, tile: "bg-gold-100 text-gold-700" },
};

type Bucket = { key: "today" | "yesterday" | "earlier"; items: PublicNotification[] };

/**
 * Three buckets, not one heading per calendar day: a festival week produces a
 * lot of days, and "Earlier" is the honest name for all of them.
 */
function bucketByDay(items: readonly PublicNotification[]): Bucket[] {
  const today = festivalToday();
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const buckets: Bucket[] = [
    { key: "today", items: [] },
    { key: "yesterday", items: [] },
    { key: "earlier", items: [] },
  ];

  for (const item of items) {
    const day = istDay(item.published_at);
    const bucket =
      day === today ? buckets[0] : day === yesterdayKey ? buckets[1] : buckets[2];
    bucket.items.push(item);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

export function NotificationFeed({
  notifications,
}: {
  notifications: PublicNotification[];
}) {
  const { t } = useI18n();
  const { unread, count, markAllRead, markRead } = useUnread(notifications);

  // Without a watermark every notice ever published would be "new" to a phone
  // opening the app for the first time. Planted once, here and in the bell.
  useEffect(() => {
    seedReadState();
  }, []);

  const buckets = useMemo(() => bucketByDay(notifications), [notifications]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "t-caption font-medium",
            count > 0 ? "text-saffron-700" : "text-ink-400",
          )}
        >
          {count > 0
            ? plural(count, t.notifications.unreadOne, t.notifications.unreadMany)
            : t.notifications.upToDate}
        </p>

        {count > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            className={cn(
              "press inline-flex shrink-0 items-center gap-1.5 rounded-full",
              "bg-ink-100 px-3 py-1.5 text-[0.75rem] font-semibold text-ink-600",
              "transition-colors hover:bg-ink-200/70 hover:text-ink-900",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600",
            )}
          >
            <CheckCheck className="size-3.5" strokeWidth={2.4} aria-hidden />
            {t.notifications.markAllRead}
          </button>
        ) : null}
      </div>

      <div className="animate-rise space-y-6">
        {buckets.map((bucket) => (
          <section key={bucket.key}>
            <h2 className="t-label mb-2.5 px-1 text-ink-400">
              {t.notifications[bucket.key]}
            </h2>
            {/* One column on a phone; two once the desktop rail has taken its
                256px and there is genuinely room for them at lg. */}
            <ul className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
              {bucket.items.map((notification) => (
                <li key={notification.id}>
                  <NotificationRow
                    notification={notification}
                    isUnread={unread.has(notification.id)}
                    onOpen={() => markRead(notification.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  isUnread,
  onOpen,
}: {
  notification: PublicNotification;
  isUnread: boolean;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const view = describeNotification(t, notification);
  const { icon: Icon, tile } = KIND[notification.kind];

  return (
    <Link
      href={notification.href}
      onClick={onOpen}
      aria-label={`${view.label}: ${notification.subject}`}
      className={cn(
        "card card-interactive relative block overflow-hidden p-4",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600",
        // Unread reads as warmth on the whole row plus a rail down the edge —
        // a dot alone is invisible on a phone held at arm's length.
        isUnread && "border-saffron-200 bg-saffron-50/50",
      )}
    >
      {isUnread ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-saffron-500"
        />
      ) : null}

      <div className={cn("flex gap-3.5", isUnread && "pl-1.5")}>
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-tile",
            tile,
          )}
        >
          <Icon className="size-[1.15rem]" strokeWidth={2} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "t-label min-w-0 truncate",
                notification.kind === "notice"
                  ? "text-danger-700"
                  : "text-ink-400",
              )}
            >
              {view.label}
            </span>
            {isUnread ? (
              <span className="shrink-0 rounded-full bg-saffron-600 px-2 py-0.5 text-[0.625rem] leading-none font-semibold text-white">
                {t.notifications.newLabel}
              </span>
            ) : null}
          </div>

          <h3 className="t-h3 mt-1 text-ink-900">{notification.subject}</h3>

          {view.timing ? (
            <p className="t-caption mt-1 font-medium text-ink-700">
              {view.timing}
              {view.previously ? (
                <span className="font-normal text-ink-400">
                  {" · "}
                  {view.previously}
                </span>
              ) : null}
            </p>
          ) : null}

          {notification.detail ? (
            <p className="t-small mt-1.5 line-clamp-2 text-ink-600">
              {notification.detail}
            </p>
          ) : null}

          <time
            dateTime={notification.published_at}
            className="t-caption mt-2 block text-ink-400"
          >
            {timeAgo(notification.published_at)}
          </time>
        </div>
      </div>
    </Link>
  );
}
