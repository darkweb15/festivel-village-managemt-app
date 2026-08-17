import Link from "next/link";
import { Bell, LayoutGrid } from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { getDictionary } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/**
 * The home-screen header: brand lockup on the left, quick actions on the right.
 * Sticky so it stays available while the feed scrolls.
 */
export async function AppHeader({
  hasNewAnnouncements = false,
}: {
  hasNewAnnouncements?: boolean;
}) {
  const t = await getDictionary();

  return (
    // md:hidden — on desktop the left rail already carries the brand and nav.
    <header
      className="sticky top-0 z-30 border-b border-hairline/80 bg-white/88 backdrop-blur-xl md:hidden"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
          aria-label={t.brand.name}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-600 text-white shadow-[0_4px_12px_-4px_rgba(234,83,8,0.6)]">
            <GaneshaMark className="size-[1.375rem]" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 leading-tight">
            {/* Both lines run long in Telugu ("శ్రీ కృష్ణ గణేశ్ ఉత్సవ కమిటీ"),
                so each is a step smaller and truncates rather than pushing the
                two header actions off a 390px row. */}
            <span className="block truncate text-[0.875rem] leading-snug font-semibold tracking-[-0.015em] text-ink-900 sm:text-[0.9375rem]">
              {t.brand.nameLine1}
            </span>
            <span className="block truncate text-[0.6875rem] leading-snug font-medium text-ink-500">
              {t.brand.nameLine2}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <HeaderAction
            href="/announcements"
            label={t.nav.announcements}
            badge={hasNewAnnouncements}
            badgeLabel={t.common.new}
          >
            <Bell className="size-[1.15rem]" strokeWidth={1.9} aria-hidden />
          </HeaderAction>
          <HeaderAction href="/more" label={t.common.menu}>
            <LayoutGrid className="size-[1.15rem]" strokeWidth={1.9} aria-hidden />
          </HeaderAction>
        </div>
      </div>
    </header>
  );
}

function HeaderAction({
  href,
  label,
  badge = false,
  badgeLabel,
  children,
}: {
  href: string;
  label: string;
  badge?: boolean;
  badgeLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="press relative grid size-10 place-items-center rounded-full border border-ink-200/70 bg-white text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
    >
      {children}
      {badge ? (
        <span
          className="absolute top-2 right-2.5 size-2 rounded-full bg-saffron-600 ring-2 ring-white"
          aria-label={badgeLabel}
        />
      ) : null}
    </Link>
  );
}

/** Header for every screen below Home: back affordance, title, optional action. */
export async function PageHeader({
  title,
  subtitle,
  backHref = "/more",
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = await getDictionary();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-hairline/80 bg-white/88 backdrop-blur-xl",
        className,
      )}
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <Link
          href={backHref}
          aria-label={t.common.back}
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-ink-200/70 bg-white text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-[1.15rem]"
            aria-hidden
          >
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[0.75rem] text-ink-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

/** Large title header used by the top-level tabs (Events, Donate, Gallery). */
export function TabHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-hairline/80 bg-white/88 backdrop-blur-xl"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex min-h-16 items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[0.8125rem] text-ink-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
