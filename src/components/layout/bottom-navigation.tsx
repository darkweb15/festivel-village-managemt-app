"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  HeartHandshake,
  Home,
  Images,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  /** Key into the nav section of the dictionary. */
  label: "home" | "events" | "donate" | "gallery" | "more";
  icon: LucideIcon;
  /** Sub-routes that should keep this tab lit. */
  match?: string[];
};

// Still five tabs. Pooja Schedule and Book a Pooja keep their own entries in the
// desktop rail and on the More screen — adding them here would put seven targets
// across a 390px bar, which is a redesign, not a translation.
const ITEMS: NavItem[] = [
  { href: "/", label: "home", icon: Home },
  { href: "/events", label: "events", icon: CalendarDays, match: ["/pooja", "/book"] },
  { href: "/donate", label: "donate", icon: HeartHandshake },
  { href: "/gallery", label: "gallery", icon: Images },
  {
    href: "/more",
    label: "more",
    icon: LayoutGrid,
    match: [
      "/committee",
      "/announcements",
      "/notifications",
      "/location",
      "/volunteers",
      "/sponsors",
      "/festival",
      "/contact",
      "/live",
      "/settings",
      "/setup",
      "/assistant",
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.match ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t.nav.primaryAria}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/92 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-[30rem] items-stretch">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex h-[4.5rem] flex-col items-center justify-center gap-1.5 outline-offset-[-4px]"
              >
                {/* active indicator */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-0.5 rounded-full bg-saffron-600 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active ? "w-8 opacity-100" : "w-0 opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-tile transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active
                      ? "bg-saffron-50 text-saffron-600"
                      : "text-ink-400 group-hover:text-ink-600",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[1.3rem] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      active && "scale-110",
                    )}
                    strokeWidth={active ? 2.3 : 1.9}
                    aria-hidden
                  />
                </span>
                {/* Telugu labels run much longer than the English ones
                    ("కార్యక్రమాలు" vs "Events"), and five tabs share a 390px
                    bar — so the label is allowed to shrink a step and is
                    clipped rather than allowed to push the row wider. */}
                <span
                  className={cn(
                    "block max-w-full truncate px-0.5 text-center leading-none font-medium transition-colors duration-200",
                    "text-[0.625rem] sm:text-[0.6875rem]",
                    active ? "font-semibold text-saffron-700" : "text-ink-400",
                  )}
                >
                  {t.nav[item.label]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
