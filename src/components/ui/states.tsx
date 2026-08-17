"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, DatabaseZap, Inbox } from "lucide-react";
import { useOptionalI18n } from "@/lib/i18n/client";
import { en } from "@/lib/i18n/dictionaries/en";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./button";

/** Shimmer block used by every loading skeleton in the app. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-3/5" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-ink-100 text-ink-400">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <p className="text-[0.9375rem] font-semibold text-ink-900">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[15rem] text-[0.8125rem] leading-relaxed text-ink-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * Shared by the public app and the admin panel, so it reads the language
 * optionally: translated inside the public shell, English in admin.
 */
export function ErrorState({ message }: { message?: string }) {
  const t = useOptionalI18n()?.t ?? en;

  return (
    <div className="rounded-card border border-danger-500/20 bg-danger-50 px-5 py-6 text-center">
      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-white text-danger-500">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-danger-700">
        {t.states.errorTitle}
      </p>
      <p className="mx-auto mt-1.5 max-w-[17rem] text-[0.8125rem] leading-relaxed text-danger-700/80">
        {message ?? t.states.errorBody}
      </p>
    </div>
  );
}

/**
 * Quiet inline placeholder for a section whose data can't load because Supabase
 * isn't connected yet. Kept small on purpose — the full explanation lives in
 * the one `SetupBanner` at the top of the screen, so a page with several
 * data-driven sections doesn't repeat the same paragraph five times.
 */
export function SetupNotice({ what = "this section" }: { what?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-dashed border-ink-300 bg-ink-50/60 px-4 py-4">
      <DatabaseZap className="size-4 shrink-0 text-ink-400" aria-hidden />
      <p className="text-[0.8125rem] text-ink-500">
        Waiting for the database to be connected to show {what}.
      </p>
    </div>
  );
}

/**
 * One prominent, screen-level explanation of the unconnected state. Rendered by
 * the app shell so it appears exactly once per screen.
 */
export function SetupBanner() {
  return (
    <div className="border-b border-saffron-200 bg-saffron-50 px-5 py-3">
      <div className="flex items-center gap-3">
        <DatabaseZap className="size-4 shrink-0 text-saffron-600" aria-hidden />
        <p className="min-w-0 flex-1 text-[0.75rem] leading-relaxed text-ink-700">
          <span className="font-semibold text-ink-900">Database not connected.</span>{" "}
          Add your Supabase keys to{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.6875rem] text-saffron-700">
            .env.local
          </code>{" "}
          and run the migrations.
        </p>
        <Link href="/setup" className={buttonClasses("secondary", "sm", "shrink-0")}>
          Set up
        </Link>
      </div>
    </div>
  );
}
