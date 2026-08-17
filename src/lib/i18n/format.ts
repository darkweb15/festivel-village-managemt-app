/**
 * Placeholder substitution for dictionary strings.
 *
 * Dictionary values must be plain data: the whole dictionary is handed from the
 * server layout to the client provider, and React cannot serialise a function
 * across that boundary. So a phrase that needs a value carries a `{name}`
 * placeholder and is filled in here at the call site.
 *
 *   fmt("{available} of {total} left", { available: 3, total: 10 })
 *   → "3 of 10 left"
 *
 * An unknown placeholder is left untouched rather than replaced with
 * "undefined", so a typo shows up as `{typo}` on screen instead of silently
 * printing nonsense.
 */
export function fmt(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Picks the singular or plural form, then fills placeholders.
 * Telugu and English both need only these two forms here.
 */
export function plural(
  count: number,
  one: string,
  other: string,
  values: Record<string, string | number> = {},
): string {
  return fmt(count === 1 ? one : other, { n: count, ...values });
}
