import type { HistoryCache, HistoryRow } from "../../../../data/history";
import { formatNumber } from "../../../../format";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Language,
  SolarConfig,
  SolarModel,
  SolarPoint,
  SolarTab,
  Translator,
} from "../../../../types";

export const DAY_MS = 86_400_000;

export const SOLAR_TABS: readonly SolarTab[] = [
  "overblik",
  "produktion",
  "batteri",
  "prognose",
  "afkast",
];

const SOLAR_VALUE_KEYS = [
  "power",
  "today",
  "forecastToday",
  "forecastTomorrow",
  "batterySoc",
  "load",
  "grid",
  "batteryPower",
  "pv3",
  "pv4",
  "totalProduction",
  "month",
  "year",
  "forecastRemaining",
  "forecastNow",
  "forecastCurrentHour",
  "forecastNextHour",
  "forecastNext24h",
  "forecastD2",
  "forecastD3",
  "batteryTemperature",
  "batteryVoltage",
  "batteryCurrent",
  "batteryCharge",
  "batteryDischarge",
  "batteryMinSoc",
  "batteryMaxSoc",
  "inverterTemperature",
  "inverterFrequency",
  "wifiSignal",
  "uptime",
  "gridL1",
  "gridL2",
  "gridL3",
  "pv3Voltage",
  "pv3Current",
  "pv4Voltage",
  "pv4Current",
  "savingsTotal",
  "savingsSolar",
  "savingsBattery",
  "savingsRate",
  "investmentSolar",
  "investmentBattery",
  "paybackPercent",
] as const;

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function localeFor(language: Language): string {
  return language === "da" ? "da-DK" : "en-GB";
}

/** Mirrors the legacy `languageOf` fallback used by the solar sheet. */
export function languageOf(
  model: HomeModel,
  config: ArcusConfig,
  t: Translator,
): Language {
  const modelLanguage = (model as { language?: unknown }).language;
  if (modelLanguage === "da" || modelLanguage === "en") return modelLanguage;
  if (config.language === "da" || config.language === "en") {
    return config.language;
  }
  return t("common.today") === "I dag" ? "da" : "en";
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function fmt(
  value: number | null | undefined,
  digits: number,
  language: Language,
): string {
  return formatNumber(value, digits, language);
}

/** Card chart keys for a rolling 24-hour window. */
export function windowKey(entityId: string | undefined): string {
  return `24:${entityId ?? ""}`;
}

/** Card chart keys for the full cached history (7 days / 1 year). */
export function entityKey(entityId: string | undefined): string {
  return entityId ?? "";
}

export function solarHasData(
  solar: SolarModel | undefined,
): solar is SolarModel {
  if (!solar) return false;
  if (solar.forecastSeries?.length || solar.tomorrowSeries?.length) return true;
  return SOLAR_VALUE_KEYS.some((key) => isFiniteNumber(solar[key]));
}

export function normalizeSub(sub: string | null | undefined): SolarTab {
  return SOLAR_TABS.includes(sub as SolarTab) ? (sub as SolarTab) : "overblik";
}

export function solarNumber(
  solar: SolarModel | undefined,
  hass: ArcusHass,
  key: string,
  entityId: string | undefined,
): number | null {
  const value = solar?.[key];
  if (isFiniteNumber(value)) return value;
  if (!entityId) return null;
  const state = hass.states?.[entityId]?.state;
  if (state === null || state === undefined || state === "") return null;
  const number = Number(state);
  return Number.isFinite(number) ? number : null;
}

export function historySeries(
  history: HistoryCache,
  id: string | undefined,
  days: number,
): Array<number | null> {
  if (!id) return [];
  try {
    return history.window(id, days) ?? [];
  } catch {
    return [];
  }
}

export function safeRaw(
  history: HistoryCache,
  id: string | undefined,
): HistoryRow[] {
  if (!id) return [];
  try {
    return history.raw(id) ?? [];
  } catch {
    return [];
  }
}

export function rowTime(row: HistoryRow): number {
  const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed;
  if (typeof raw === "number") {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (typeof raw === "string") {
    if (/^\d+(\.\d+)?$/.test(raw)) {
      const number = Number(raw);
      return number < 1e12 ? number * 1000 : number;
    }
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function rowValue(row: HistoryRow): number | null {
  const raw = row.s ?? row.state;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value || value === "unavailable" || value === "unknown") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function pointDate(point: SolarPoint): Date | null {
  const raw = point.t as unknown;
  const date = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function pointsOnDate(
  points: SolarPoint[] | undefined,
  date: Date,
): SolarPoint[] {
  if (!Array.isArray(points)) return [];
  return points.filter((point) => {
    const parsed = pointDate(point);
    return parsed !== null && sameLocalDay(parsed, date);
  });
}

export function todayForecastValues(solar: SolarModel, now: Date): number[] {
  return pointsOnDate(solar.forecastSeries, now).map((point) => point.v);
}

export function forecast48Values(solar: SolarModel, now: Date): number[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const points = [
    ...pointsOnDate(solar.forecastSeries, now),
    ...pointsOnDate(solar.tomorrowSeries, tomorrow),
    ...pointsOnDate(solar.forecastSeries, tomorrow),
  ];
  const byTime = new Map<number, number>();
  for (const point of points) {
    const date = pointDate(point);
    if (date) byTime.set(date.getTime(), point.v);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

export interface DayBarDatum {
  key: string;
  label: string;
  value: number;
  today: boolean;
}

export function dailyProductionDays(
  history: HistoryCache,
  entityId: string | undefined,
  now: Date,
  language: Language,
): DayBarDatum[] {
  const rows = safeRaw(history, entityId);
  const byDay = new Map<string, number>();
  for (const entry of rows) {
    const time = rowTime(entry);
    const value = rowValue(entry);
    if (!time || value === null) continue;
    const key = localDayKey(new Date(time));
    byDay.set(key, Math.max(byDay.get(key) ?? 0, value));
  }
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);
  const todayKey = localDayKey(now);
  const weekday = new Intl.DateTimeFormat(localeFor(language), {
    weekday: "short",
  });
  return days.map(([key, value]) => {
    const date = new Date(`${key}T12:00:00`);
    return {
      key,
      label: weekday.format(date).replace(/\.$/, ""),
      value,
      today: key === todayKey,
    };
  });
}

export function sumDelta(
  history: HistoryCache,
  id: string | undefined,
  days: number,
  now: Date,
): number | null {
  if (!id) return null;
  const rows = safeRaw(history, id);
  const cutoff =
    days === 1
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      : now.getTime() - days * DAY_MS;
  const points: Array<{ time: number; value: number }> = [];
  for (const entry of rows) {
    const time = rowTime(entry);
    const value = rowValue(entry);
    if (!time || time < cutoff || value === null) continue;
    points.push({ time, value });
  }
  if (points.length < 2) return null;
  points.sort((a, b) => a.time - b.time);
  return points[points.length - 1].value - points[0].value;
}

export function installedAtValue(
  solar: SolarModel | undefined,
  hass: ArcusHass,
  config: ArcusConfig,
  language: Language,
): string {
  const modelValue = solar?.installedAt;
  const entityId = config.solar?.installedAt;
  const stateValue = entityId ? hass.states?.[entityId]?.state : undefined;
  const raw =
    typeof modelValue === "string" && modelValue ? modelValue : stateValue;
  if (!raw) return "–";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ensureHistory(
  history: HistoryCache,
  config: SolarConfig | undefined,
  sub: SolarTab,
): void {
  if (!config) return;

  const request = (ids: string[], hours: number): void => {
    if (!ids.length) return;
    try {
      const pending = history.ensure(ids, hours);
      if (pending && typeof pending.catch === "function") {
        pending.catch(() => {
          /* history is optional; current values still render */
        });
      }
    } catch {
      /* history is optional; current values still render */
    }
  };

  // The payback tab only needs the savings total, but it needs a year of it.
  if (sub === "afkast") {
    request(config.savingsTotal ? [config.savingsTotal] : [], 24 * 365);
    return;
  }

  const ids = new Set<string>();
  const add = (id?: string) => {
    if (id) ids.add(id);
  };
  add(config.batterySoc);
  add(config.batteryCharge);
  add(config.batteryDischarge);
  add(config.today);
  add(config.power);
  add(config.load);
  add(config.grid);
  add(config.batteryPower);
  add(config.pv3);
  add(config.pv4);
  add(config.gridL1);
  add(config.gridL2);
  add(config.gridL3);
  request([...ids], 24 * 7);
}

/** Fraction of the local day for an instant, 0 at midnight and 1 at 24:00. */
export function dayFraction(date: Date): number {
  return (
    (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) /
    86_400
  );
}
