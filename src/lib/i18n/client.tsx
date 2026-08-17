"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

/**
 * Translations for client components.
 *
 * The dictionary is handed down from the server layout, which already read the
 * cookie — so a client component renders the right language on its very first
 * paint, with no flash of English and no second fetch.
 */

type I18nValue = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside the public app's I18nProvider.");
  }
  return value;
}

/**
 * For the handful of components shared by the public app and the admin panel.
 *
 * Inside the public shell this returns the reader's language; in the admin
 * panel there is no provider and it returns `null`, so the caller can fall back
 * to English — which is what the admin panel is supposed to be anyway.
 */
export function useOptionalI18n(): I18nValue | null {
  return useContext(I18nContext);
}
