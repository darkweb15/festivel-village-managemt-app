import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY, MONEY_LOCALE, TIMEZONE } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ₹1,24,500 — Indian grouping, no decimals unless the amount has paise. */
export function formatCurrency(amount: number, opts?: { compact?: boolean }) {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: hasPaise ? 2 : 0,
    minimumFractionDigits: hasPaise ? 2 : 0,
    notation: opts?.compact ? "compact" : "standard",
  }).format(amount);
}

/** 1,24,500 — same grouping without the currency symbol. */
export function formatNumber(value: number) {
  return new Intl.NumberFormat(MONEY_LOCALE).format(value);
}

/** "24 AUG" — the two-line date badge used on event cards. */
export function formatDateBadge(iso: string) {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(MONEY_LOCALE, {
      day: "2-digit",
      timeZone: TIMEZONE,
    }).format(d),
    month: new Intl.DateTimeFormat(MONEY_LOCALE, {
      month: "short",
      timeZone: TIMEZONE,
    })
      .format(d)
      .toUpperCase(),
  };
}

/** "24 August 2026" */
export function formatFullDate(iso: string) {
  return new Intl.DateTimeFormat(MONEY_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

/** "24 Aug 2026" — compact enough for a dense feed row. */
export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat(MONEY_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

/** "07:00 PM" from a Postgres `time` value ("19:00:00") or an ISO timestamp. */
export function formatTime(value: string | null) {
  if (!value) return null;
  const iso = value.includes("T") ? value : `1970-01-01T${value}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(MONEY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: value.includes("T") ? TIMEZONE : "UTC",
  })
    .format(d)
    .toUpperCase();
}

/** "Today", "Tomorrow", "24 Aug" — relative labels for schedule rows. */
export function relativeDayLabel(iso: string) {
  const target = startOfDayIST(new Date(iso));
  const today = startOfDayIST(new Date());
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return new Intl.DateTimeFormat(MONEY_LOCALE, {
    day: "numeric",
    month: "short",
    timeZone: TIMEZONE,
  }).format(target);
}

/**
 * Heading for a day section: "Today" + "16 August 2026", but just
 * "24 August 2026" for ordinary dates — otherwise the two halves say the
 * same thing twice ("24 Aug · 24 August 2026").
 */
export function dayHeading(iso: string): { label: string; sub: string | null } {
  const relative = relativeDayLabel(iso);
  const full = formatFullDate(iso);
  const isRelative = ["Today", "Tomorrow", "Yesterday"].includes(relative);
  return isRelative ? { label: relative, sub: full } : { label: full, sub: null };
}

/** "2 hours ago" — used on announcement cards. */
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(MONEY_LOCALE, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit);
  }
  return "just now";
}

function startOfDayIST(date: Date) {
  // Format the instant in IST, then re-parse as a plain date so day maths is
  // done in the committee's timezone rather than the visitor's.
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);
  return new Date(`${parts}T00:00:00Z`);
}

/** The calendar day an instant falls on in IST, as YYYY-MM-DD. */
export function istDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

/**
 * Today's date in the committee's timezone as YYYY-MM-DD.
 * Lives here rather than in a component so the clock read stays outside render.
 */
export function festivalToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date());
}

/** `festivalToday()` shifted by whole days, e.g. `festivalDate(1)` for tomorrow. */
export function festivalDate(offsetDays: number): string {
  const base = new Date(`${festivalToday()}T00:00:00Z`);
  return new Date(base.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** True when `iso` is within the last `hours`. Kept out of components so the
 *  clock read stays outside render. */
export function isWithinHours(iso: string | undefined, hours: number) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < hours * 60 * 60 * 1000;
}

/** Clamp a 0–100 percentage for progress bars, tolerating over-funding. */
export function percentOf(value: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

/** Deterministic initials for avatar fallbacks. */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
