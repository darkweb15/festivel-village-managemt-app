"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, isLocale } from "@/lib/i18n/config";

/**
 * Stores the reader's language choice.
 *
 * Only the cookie changes — no route, no query string, no database write — so
 * the switch survives navigation and refresh, and every server component picks
 * the new language up on the next render.
 */
export async function setLocale(value: string) {
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);

  // Every public screen reads the dictionary, so the whole tree is re-rendered.
  revalidatePath("/", "layout");
}
