"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { APP } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon };

const GROUPS: { heading: string; items: Item[] }[] = [
  {
    heading: "Festival",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/events", label: "Events", icon: CalendarDays },
      { href: "/pooja", label: "Pooja Schedule", icon: Sparkles },
      { href: "/book", label: "Book a Pooja", icon: CalendarHeart },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    heading: "Community",
    items: [
      { href: "/donate", label: "Festival Fund", icon: HeartHandshake },
      { href: "/gallery", label: "Gallery", icon: Images },
      { href: "/live", label: "Live Darshan", icon: Radio },
      { href: "/committee", label: "Committee", icon: Users },
      { href: "/location", label: "Location", icon: MapPin },
    ],
  },
  {
    heading: "Assistant",
    items: [{ href: "/assistant", label: "Sri Krishna AI", icon: Sparkle }],
  },
];

/**
 * Desktop-only rail. The mobile design language is kept intact — same icons,
 * same saffron active treatment — just laid out vertically.
 */
export function SideNavigation() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-hairline md:bg-white lg:w-72">
      <Link href="/" className="flex items-center gap-3 px-6 py-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-600 text-white">
          <GaneshaMark className="size-[1.375rem]" strokeWidth={2.4} />
        </span>
        <span className="leading-tight">
          <span className="block text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink-900">
            {APP.nameLine1}
          </span>
          <span className="block text-[0.6875rem] leading-snug font-medium text-ink-500">
            {APP.nameLine2}
          </span>
        </span>
      </Link>

      <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pb-6">
        {GROUPS.map((group) => (
          <div key={group.heading} className="mb-6">
            <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-400 uppercase">
              {group.heading}
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
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="border-t border-hairline px-6 py-4 text-[0.6875rem] leading-relaxed text-ink-400">
        {APP.festival}
      </p>
    </aside>
  );
}
