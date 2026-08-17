"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Flame,
  Handshake,
  HandHeart,
  History,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Phone,
  Receipt,
  Settings2,
  Sparkles,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon };

const GROUPS: { heading: string; items: Item[] }[] = [
  {
    heading: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/bookings", label: "Pooja Bookings", icon: CalendarCheck },
      { href: "/admin/copilot", label: "AI Copilot", icon: Sparkles },
      { href: "/admin/ai-activity", label: "AI Activity", icon: History },
    ],
  },
  {
    heading: "Finance",
    items: [
      { href: "/admin/donations", label: "Donations", icon: Wallet },
      { href: "/admin/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/pooja_schedule", label: "Pooja Timings", icon: Flame },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
    ],
  },
  {
    heading: "People",
    items: [
      { href: "/admin/committee_members", label: "Committee", icon: Users },
      { href: "/admin/volunteers", label: "Volunteers", icon: HandHeart },
      { href: "/admin/volunteer_assignments", label: "Volunteer Duties", icon: ClipboardList },
      { href: "/admin/sponsors", label: "Sponsors", icon: Handshake },
      { href: "/admin/contact_information", label: "Contacts", icon: Phone },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { href: "/admin/settings", label: "Festival Settings", icon: Settings2 },
      { href: "/admin/account", label: "My Account", icon: KeyRound },
    ],
  },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the drawer whenever the route changes. Adjusting state during render
  // (rather than in an effect) avoids a second render pass showing the old
  // drawer over the new page.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="press grid size-9 place-items-center rounded-tile border border-ink-200 text-ink-600"
        >
          <Menu className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        </button>
        <span className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink-900">
          Committee Admin
        </span>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="animate-fade fixed inset-0 z-40 bg-ink-900/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-hairline bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-saffron-600 text-white">
            <GaneshaMark className="size-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem] font-semibold tracking-[-0.015em] text-ink-900">
              Committee Admin
            </p>
            <p className="truncate text-[0.6875rem] text-ink-400">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="press grid size-8 place-items-center rounded-full text-ink-400 lg:hidden"
          >
            <X className="size-4" strokeWidth={2.2} aria-hidden />
          </button>
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 pb-4">
          {GROUPS.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="px-3 pb-1.5 text-[0.625rem] font-semibold tracking-[0.1em] text-ink-400 uppercase">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-tile px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                          active
                            ? "bg-saffron-50 text-saffron-700"
                            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                        )}
                      >
                        <Icon
                          className="size-4 shrink-0"
                          strokeWidth={active ? 2.3 : 1.9}
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

        <div className="space-y-1 border-t border-hairline p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-tile px-3 py-2 text-[0.8125rem] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <GaneshaMark className="size-4" strokeWidth={2.4} />
            View public app
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-tile px-3 py-2 text-[0.8125rem] font-medium text-ink-600 transition-colors hover:bg-danger-50 hover:text-danger-700"
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
