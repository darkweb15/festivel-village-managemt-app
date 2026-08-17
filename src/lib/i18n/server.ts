import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { te } from "./dictionaries/te";

const DICTIONARIES: Record<Locale, Dictionary> = { en, te };

/**
 * The reader's chosen language, from the cookie the switcher writes.
 * Falls back to English for a first-time visitor or an unrecognised value.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server-component translations. */
export async function getDictionary(): Promise<Dictionary> {
  return DICTIONARIES[await getLocale()];
}

/** Both at once, for the many screens that need the locale for `lang` too. */
export async function getI18n(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: DICTIONARIES[locale] };
}

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
