/**
 * Language configuration for the public app.
 *
 * The locale lives in a cookie rather than in the URL. A village link that is
 * forwarded on WhatsApp stays `/book`, not `/te/book`, every existing bookmark
 * keeps working, and no route in the app has to be restructured — the choice
 * follows the reader, not the address.
 *
 * The admin panel, the AI copilot and everything technical stay English
 * regardless of this setting.
 */

export const LOCALES = ["en", "te"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * First-time visitors get Telugu — the app is for the village, and most people
 * opening it read Telugu first. Anyone who wants English picks it from the
 * switcher, and that choice sticks in the cookie.
 */
export const DEFAULT_LOCALE: Locale = "te";

export const LOCALE_COOKIE = "sv_locale";

/** A year — long enough that a villager sets this once and never again. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_COOKIE_OPTIONS = {
  // Readable by the client so the switcher can render optimistically; it holds
  // no secret, only "en" or "te".
  httpOnly: false,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: LOCALE_COOKIE_MAX_AGE,
} as const;

/** How each language names itself — never translated, by convention. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  te: "తెలుగు",
};

/** Goes on the `lang` attribute so screen readers pick the right voice. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  te: "te",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
