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
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sub-routes that should keep this tab lit. */
  match?: string[];
};

const ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays, match: ["/pooja", "/book"] },
  { href: "/donate", label: "Donate", icon: HeartHandshake },
  { href: "/gallery", label: "Gallery", icon: Images },
  {
    href: "/more",
    label: "More",
    icon: LayoutGrid,
    match: [
      "/committee",
      "/announcements",
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

  return (
    <nav
      aria-label="Primary"
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
                <span
                  className={cn(
                    "text-[0.6875rem] leading-none font-medium transition-colors duration-200",
                    active ? "font-semibold text-saffron-700" : "text-ink-400",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
