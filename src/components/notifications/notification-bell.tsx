"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/format";
import { seedReadState, useUnread } from "@/lib/notifications/read-state";
import type { NotificationDigest } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * The header bell, with the unread count this device has not cleared.
 *
 * The count is computed in the browser from `digest` — ids and timestamps only
 * — because the server has no idea what this phone has already seen. Before
 * hydration the bell renders bare, so nothing flashes on and off.
 */
export function NotificationBell({
  digest,
  className,
}: {
  digest: NotificationDigest[];
  className?: string;
}) {
  const { t } = useI18n();
  const { count } = useUnread(digest);

  useEffect(() => {
    seedReadState();
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={
        count > 0
          ? fmt(t.notifications.unreadAria, { n: count })
          : t.nav.notifications
      }
      className={cn(
        "press relative grid size-10 place-items-center rounded-full border",
        "border-ink-200/70 bg-white text-ink-600 transition-colors",
        "hover:border-ink-300 hover:text-ink-900",
        className,
      )}
    >
      <Bell className="size-[1.15rem]" strokeWidth={1.9} aria-hidden />

      {count > 0 ? (
        // Ten unread and a hundred unread mean the same thing to a reader, and
        // three digits would not fit on the button anyway.
        <span
          aria-hidden
          className={cn(
            "absolute -top-0.5 -right-0.5 grid h-[1.125rem] min-w-[1.125rem]",
            "place-items-center rounded-full bg-saffron-600 px-1",
            "text-[0.625rem] leading-none font-bold text-white tabular-nums",
            "ring-2 ring-white",
          )}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
