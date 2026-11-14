import type { Language } from "./types";

const LOCALES: Record<Language, string> = {
  da: "da-DK",
  en: "en-GB",
};

function localeFor(language: Language | string | undefined): string {
  return String(language ?? "da")
    .toLowerCase()
    .startsWith("da")
    ? LOCALES.da
    : LOCALES.en;
}

export function numberFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Parse a Home Assistant state value. The recorder's `"unavailable"` and
 * `"unknown"` strings count as missing values, like `numberFrom` does for
 * empty and non-numeric input.
 */
export function numberFromState(value: unknown): number | null {
  if (value === "unavailable" || value === "unknown") return null;
  return numberFrom(value);
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format a number with a fixed number of decimals. Missing or non-numeric
 * values become an en dash so rooms and chapters stay readable.
 */
export function formatNumber(
  value: number | string | null | undefined,
  digits = 1,
  language: Language | string = "da",
): string {
  const number = numberFrom(value);
  if (number === null) return "–";
  const decimals =
    Number.isFinite(digits) && digits >= 0 ? Math.floor(digits) : 0;
  return new Intl.NumberFormat(localeFor(language), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

/** Prices use two decimals: `1,75` in Danish, `1.75` in English. */
export function formatPrice(
  value: number | string | null | undefined,
  language: Language | string = "da",
): string {
  return formatNumber(value, 2, language);
}

/**
 * Format the clock in 24-hour time. Intl da-DK uses a dot between hours and
 * minutes, so the parts are joined explicitly with a colon to match the
 * prototype and Home Assistant's own clock.
 */
export function formatTime(
  date: Date | string | number | null | undefined,
  language: Language | string = "da",
): string {
  const parsed = toDate(date);
  if (!parsed) return "–";
  const parts = new Intl.DateTimeFormat(localeFor(language), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Long local date, e.g. `fredag 13. november` or `Friday 13 November`. */
export function formatDateLong(
  date: Date | string | number | null | undefined,
  language: Language | string = "da",
): string {
  const parsed = toDate(date);
  if (!parsed) return "–";
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parsed);
}

/** Time-of-day greeting, using Home Assistant's local clock. */
export function greeting(
  date: Date | string | number | null | undefined,
  language: Language | string = "da",
): string {
  const parsed = toDate(date);
  if (!parsed) return localeFor(language) === LOCALES.da ? "Hej" : "Hello";
  const hour = parsed.getHours();
  if (hour >= 5 && hour < 11) {
    return localeFor(language) === LOCALES.da ? "Godmorgen" : "Good morning";
  }
  if (hour >= 11 && hour < 17) {
    return localeFor(language) === LOCALES.da ? "Godmiddag" : "Good afternoon";
  }
  if (hour >= 17 && hour < 23) {
    return localeFor(language) === LOCALES.da ? "Godaften" : "Good evening";
  }
  return localeFor(language) === LOCALES.da ? "Godnat" : "Good night";
}

/**
 * Human-readable countdown. Targets in the past wrap to the next day, which
 * keeps the prayer countdown correct after midnight while still using the
 * same "next occurrence" behaviour as the prototype.
 */
export function countdown(
  target: Date | string | number | null | undefined,
  now: Date | string | number | null | undefined = new Date(),
  language: Language | string = "da",
): string {
  const end = toDate(target);
  const start = toDate(now);
  if (!end || !start) return "–";
  let diff = end.getTime() - start.getTime();
  if (diff < 0) diff += 86_400_000;
  const minutes = Math.round(diff / 60_000);
  const danish = localeFor(language) === LOCALES.da;
  if (minutes < 60) {
    return danish ? `om ${minutes} min` : `in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (danish) {
    return rest ? `om ${hours} t ${rest} min` : `om ${hours} t`;
  }
  return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`;
}

/**
 * Format a value with its unit, e.g. `21,4 °C`. Missing values return an en
 * dash without a unit so empty rooms read cleanly.
 */
export function formatUnit(
  value: number | string | null | undefined,
  unit: string,
  language: Language | string = "da",
  digits = 0,
): string {
  const number = numberFrom(value);
  if (number === null) return "–";
  const formatted = formatNumber(number, digits, language);
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Escape a value for text and double-quoted attribute contexts. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
