import type { HistoryCache } from "../../../../data/history";
import { clipSeries, type ResolvedHistoryRange } from "../../../../range";
import type { Language, Translator } from "../../../../types";

/** Formats a network reading with the sheet language and digit count. */
export type TechFormat = (
  value: number | null | undefined,
  digits?: number,
) => string;

/** Buckets per window; 96 across a day is the pulse's original resolution. */
const PULSE_BUCKETS = 96;

/**
 * A held history series for one network probe across the selected window.
 * `clipSeries` stops a live day at the current instant instead of holding the
 * last value through the rest of today.
 */
export const seriesOf = (
  history: HistoryCache,
  entityId: string | undefined,
  range: ResolvedHistoryRange,
  now: Date,
): Array<number | null> => {
  if (!entityId) return [];
  if (typeof history.series !== "function") return [];
  const values = history.series(entityId, {
    start: range.start,
    end: range.end,
    buckets: PULSE_BUCKETS,
    fill: "hold",
  });
  return clipSeries(values, PULSE_BUCKETS, range, now);
};

/** Uptime in whole hours, or an en dash when the model has no reading. */
export const uptimeHours = (
  uptime: number | null | undefined,
): number | "–" => {
  return uptime === null || uptime === undefined
    ? "–"
    : Math.round(uptime / 3600);
};

export const hoursUnit = (language: Language): string => {
  return language === "da" ? "t" : "h";
};

export interface TechStatus {
  text: string;
  label: string;
  warn: boolean;
}

/** Router reachability, phrased once for the row and its status dot. */
export const techStatus = (
  t: Translator,
  online: boolean | undefined,
): TechStatus => {
  if (online === true) {
    return { text: t("tech.responds"), label: t("common.ok"), warn: false };
  }
  if (online === false) {
    return {
      text: t("tech.notResponding"),
      label: t("tech.down"),
      warn: true,
    };
  }
  return { text: "–", label: "–", warn: false };
};
