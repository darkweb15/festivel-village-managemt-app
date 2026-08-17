/**
 * Static application identity only.
 *
 * Anything the committee needs to change over time — festival dates, donation
 * goal, UPI ID, phone numbers, timings, pooja capacity, member lists — lives in
 * Supabase, not here. This file holds the product's own name and shell config.
 *
 * These are the app's *canonical* identity strings, always English. What a
 * villager reads on screen comes from `src/lib/i18n/dictionaries/` instead, in
 * whichever language they chose — these stay put for the things that must not
 * move: the AI system prompt, the UPI payload, log lines and the admin panel.
 */

export const APP = {
  /** Product name — the youth committee that runs the festival. */
  name: "Sri Krishna Youth",
  shortName: "Sri Krishna Youth",
  /** Two-line brand lockup used in the app header. */
  nameLine1: "Sri Krishna Youth",
  nameLine2: "Lingagudem Vinayaka Chavithi 2026",

  village: "Lingagudem",
  festival: "Lingagudem Vinayaka Chavithi 2026",
  festivalShort: "Vinayaka Chavithi 2026",

  tagline: "Our Village • Our Youth • Our Ganesha",
  invocation: "|| GANAPATHI BAPPA MORYA ||",

  /**
   * Goes into the `tn` field of a upi:// URI. ASCII on purpose — some UPI apps
   * mangle or reject a non-Latin note, so this one never gets localized.
   */
  upiNote: "Ganesh Utsav 2026",

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/**
 * The two AI surfaces. Same agent core, different tools and authorization.
 * These names go into the system prompt; the assistant's *displayed* name comes
 * from the dictionary so a Telugu reader sees it in Telugu.
 */
export const AI = {
  assistantName: "Sri Krishna AI Assistant",
  assistantShort: "Sri Krishna AI",
  copilotName: "Sri Krishna Youth — AI Committee Copilot",
  copilotShort: "AI Committee Copilot",
} as const;

/** Currency + locale used across every money figure in the app. */
export const MONEY_LOCALE = "en-IN";
export const CURRENCY = "INR";

/** Timezone the committee operates in — all timings are displayed in IST. */
export const TIMEZONE = "Asia/Kolkata";
