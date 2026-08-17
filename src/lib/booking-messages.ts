import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Reader-facing wording for the outcomes of the booking database functions.
 *
 * `book_pooja_slot()`, `get_booking_by_ref()` and `cancel_pooja_booking()` each
 * return a machine-readable `code` alongside an English `message`. The codes are
 * the contract; the English text is only a fallback. Resolving them here — from
 * the dictionary, rather than in the migrations — keeps the database and its
 * stored messages untouched while the reader sees their own language.
 *
 * An unknown code falls back to whatever the database said, so a future code
 * added in SQL degrades to English instead of showing nothing.
 */
export function bookingMessage(
  t: Dictionary,
  code: string | undefined,
  fallback: string,
) {
  return (code && t.bookingErrors.codes[code]) || fallback;
}

/**
 * Same, for the lookup and cancel paths.
 *
 * Both share the `not_found` code with `book_pooja_slot()`, where it means "that
 * pooja does not exist" — here it means "no booking matches that reference and
 * phone". Showing the booking-side sentence would be actively misleading, so
 * this overrides that one code and defers to the shared map for the rest.
 */
export function lookupMessage(
  t: Dictionary,
  code: string | undefined,
  fallback: string,
) {
  if (code === "not_found") return t.bookingErrors.lookupNotFound;
  return bookingMessage(t, code, fallback);
}
