import type { HistoryCache } from "../../../../data/history";
import type { Language, Translator } from "../../../../types";

/** Formats a network reading with the sheet language and digit count. */
export type TechFormat = (
  value: number | null | undefined,
  digits?: number,
) => string;

/** A held history series for one network probe, empty when unwired. */
export function seriesOf(
  history: HistoryCache,
  entityId: string | undefined,
): Array<number | null> {
  if (!entityId) return [];
  return typeof history.series === "function"
    ? history.series(entityId, { fill: "hold" })
    : [];
}

/** Uptime in whole hours, or an en dash when the model has no reading. */
export function uptimeHours(uptime: number | null | undefined): number | "–" {
  return uptime === null || uptime === undefined
    ? "–"
    : Math.round(uptime / 3600);
}

export function hoursUnit(language: Language): string {
  return language === "da" ? "t" : "h";
}

export interface TechStatus {
  text: string;
  label: string;
  warn: boolean;
}

/** Router reachability, phrased once for the row and its status dot. */
export function techStatus(
  t: Translator,
  online: boolean | undefined,
): TechStatus {
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
}
