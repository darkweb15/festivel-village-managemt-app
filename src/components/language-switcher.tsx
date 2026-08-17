"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { setLocale } from "@/app/(app)/language-actions";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Segmented English ↔ తెలుగు control.
 *
 * Built from the same vocabulary as the rest of the app — pill track, saffron
 * active state, 2% press — so it reads as part of the design rather than a
 * settings widget bolted on. Each language is written in its own script, which
 * is the one convention every bilingual interface shares: you can find your
 * language without being able to read the other one.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      // The server action revalidates the tree; this pulls the fresh render in
      // without a full page load, so scroll position and state survive.
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t.language.switcherAria}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-ink-100 p-1",
        pending && "opacity-70",
        className,
      )}
    >
      {LOCALES.map((value) => {
        const active = value === locale;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            className={cn(
              "press inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
              "text-[0.8125rem] font-semibold whitespace-nowrap",
              "transition-[background-color,color,box-shadow] duration-[--duration-fast]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600",
              active
                ? "bg-white text-saffron-700 shadow-[0_1px_3px_rgba(26,22,19,0.12)]"
                : "text-ink-500 hover:text-ink-800",
            )}
          >
            {active ? (
              <Check className="size-3.5" strokeWidth={2.6} aria-hidden />
            ) : null}
            {LOCALE_NAMES[value]}
          </button>
        );
      })}
    </div>
  );
}

/** Full-width row for the Settings and More screens. */
export function LanguageSwitcherRow() {
  const { t } = useI18n();

  return (
    <div className="card flex items-center gap-3.5 px-4 py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-50 text-saffron-600">
        <Languages className="size-[1.1rem]" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-[0.875rem] font-medium text-ink-900">
        {t.language.label}
      </span>
      <LanguageSwitcher className="shrink-0" />
    </div>
  );
}
