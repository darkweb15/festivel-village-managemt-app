"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useOptionalI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type ChipOption = { value: string; label: string };

/**
 * URL-driven segmented control. Keeping the selection in the query string means
 * the filtered list is still rendered on the server and is linkable/shareable.
 *
 * Uses useOptionalI18n so it works in both the public app (inside I18nProvider)
 * and the admin panel (no provider) — the aria-label falls back to "Filter".
 */
export function FilterChips({
  param,
  options,
  defaultValue,
  variant = "segmented",
  className,
}: {
  param: string;
  options: ChipOption[];
  defaultValue: string;
  variant?: "segmented" | "pills";
  className?: string;
}) {
  const i18n = useOptionalI18n();
  const filterLabel = i18n?.t.common.filter ?? "Filter";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const active = searchParams.get(param) ?? defaultValue;

  function select(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) next.delete(param);
    else next.set(param, value);
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label={filterLabel}
        className={cn(
          "flex gap-1 rounded-full bg-ink-100 p-1",
          isPending && "opacity-70",
          className,
        )}
      >
        {options.map((option) => {
          const selected = option.value === active;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => select(option.value)}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 text-[0.8125rem] font-semibold transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
                selected
                  ? "bg-white text-ink-900 shadow-[0_1px_3px_rgba(26,22,19,0.09)]"
                  : "text-ink-500 hover:text-ink-700",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={filterLabel}
      className={cn("scroll-x flex gap-2 pb-1", isPending && "opacity-70", className)}
    >
      {options.map((option) => {
        const selected = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => select(option.value)}
            className={cn(
              "press shrink-0 scroll-ml-5 rounded-full border px-4 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
              selected
                ? "border-saffron-600 bg-saffron-600 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900",
            )}
            style={{ scrollSnapAlign: "start" }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
