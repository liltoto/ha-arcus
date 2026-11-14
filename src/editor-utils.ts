/** Shared helpers for the card and strategy configuration editors. */

export type ConfigRecord = Record<string, unknown>;

/** True for non-null objects that are not arrays. */
export function isRecord(value: unknown): value is ConfigRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deep copy through JSON; `undefined` is preserved as-is. */
export function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
