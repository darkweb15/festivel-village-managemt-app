"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CalendarHeart,
  HeartHandshake,
  Home,
  Images,
  Megaphone,
  MapPin,
  Radio,
  Sparkle,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { useUnread } from "@/lib/notifications/read-state";
import type { NotificationDigest } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type NavKey = keyof Dictionary["nav"];
type Item = { href: string; label: NavKey; icon: LucideIcon };

const GROUPS: { heading: NavKey; items: Item[] }[] = [
  {
    heading: "groupFestival",
    items: [
      { href: "/", label: "home", icon: Home },
      { href: "/events", label: "events", icon: CalendarDays },
      { href: "/pooja", label: "poojaSchedule", icon: Sparkles },
      { href: "/book", label: "bookPooja", icon: CalendarHeart },
      { href: "/announcements", label: "announcements", icon: Megaphone },
      { href: "/notifications", label: "notifications", icon: Bell },
    ],
  },
  {
    heading: "groupCommunity",
    items: [
      { href: "/donate", label: "festivalFund", icon: HeartHandshake },
      { href: "/gallery", label: "gallery", icon: Images },
      { href: "/live", label: "live", icon: Radio },
      { href: "/committee", label: "committee", icon: Users },
      { href: "/location", label: "location", icon: MapPin },
    ],
  },
  {
    heading: "groupAssistant",
    items: [{ href: "/assistant", label: "assistant", icon: Sparkle }],
  },
];

/**
 * Desktop-only rail. The mobile design language is kept intact — same icons,
 * same saffron active treatment — just laid out vertically.
 */
export function SideNavigation({
  digest = [],
}: {
  /** Ids + timestamps for the unread count beside Notifications. */
  digest?: NotificationDigest[];
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { count: unreadCount } = useUnread(digest);

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-hairline md:bg-white lg:w-72">
      <Link href="/" className="flex items-center gap-3 px-6 py-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-600 text-white">
          <GaneshaMark className="size-[1.375rem]" strokeWidth={2.4} />
        </span>
        <span className="leading-tight">
          <span className="block text-[0.9375rem] leading-snug font-semibold tracking-[-0.015em] text-ink-900">
            {t.brand.nameLine1}
          </span>
          <span className="block text-[0.6875rem] leading-snug font-medium text-ink-500">
            {t.brand.nameLine2}
          </span>
        </span>
      </Link>

      <nav aria-label={t.nav.sectionsAria} className="flex-1 overflow-y-auto px-3 pb-6">
        {GROUPS.map((group) => (
          <div key={group.heading} className="mb-6">
            {/* No uppercase/letter-spacing here: Telugu has no case, and tracking
                pulls its conjuncts apart. */}
            <p className="px-3 pb-2 text-[0.6875rem] font-semibold text-ink-400">
              {t.nav[group.heading]}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-saffron-50 text-saffron-700"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                      )}
                    >
                      <Icon
                        className="size-[1.15rem] shrink-0"
                        strokeWidth={active ? 2.2 : 1.9}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{t.nav[label]}</span>
                      {href === "/notifications" && unreadCount > 0 ? (
                        <span
                          aria-hidden
                          className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-saffron-600 px-1.5 text-[0.6875rem] leading-none font-bold text-white tabular-nums"
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline px-6 py-4">
        <LanguageSwitcher />
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-400">
          {t.brand.festival}
        </p>
      </div>
    </aside>
  );
}
