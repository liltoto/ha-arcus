/**
 * Filter states that mean the filter is healthy, not due for a change.
 *
 * Nilan reports `Filter OK` after the filter is reset and `Skift filter`
 * (or `Change filter`) when a change is due, so matching must ignore case
 * and repeated whitespace instead of expecting a bare `OK`.
 */
const FILTER_OK_STATES = new Set([
  "ok",
  "okay",
  "filter ok",
  "filter okay",
  "filterok",
  "nej",
  "neutral",
  "off",
  "unknown",
  "unavailable",
]);

/** Whether a ventilation filter status means the filter is healthy. */
export function filterOk(value: string | null | undefined): boolean {
  if (!value) return true;
  return FILTER_OK_STATES.has(value.trim().toLowerCase().replace(/\s+/g, " "));
}
