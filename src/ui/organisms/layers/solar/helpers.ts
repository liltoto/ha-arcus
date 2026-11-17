import {
  rowValue,
  type HistoryCache,
  type HistoryRow,
} from "../../../../data/history";
import { formatNumber } from "../../../../format";
import {
  addDays,
  clipSeries,
  startOfDay,
  type ResolvedHistoryRange,
} from "../../../../range";
import type {
  ArcusConfig,
  ArcusHass,
  Language,
  SolarConfig,
  SolarModel,
  SolarPoint,
  SolarTab,
} from "../../../../types";

export const DAY_MS = 86_400_000;

const SOLAR_TABS: readonly SolarTab[] = [
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
  "pv1",
  "pv2",
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
  "pv1Voltage",
  "pv1Current",
  "pv2Voltage",
  "pv2Current",
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

const localeFor = (language: Language): string => {
  return language === "da" ? "da-DK" : "en-GB";
};

export const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

export const fmt = (
  value: number | null | undefined,
  digits: number,
  language: Language,
): string => {
  return formatNumber(value, digits, language);
};

/** Card chart keys for a rolling 24-hour window. */
export const windowKey = (entityId: string | undefined): string => {
  return `24:${entityId ?? ""}`;
};

/** Card chart keys for the full cached history (7 days / 1 year). */
export const entityKey = (entityId: string | undefined): string => {
  return entityId ?? "";
};

export const solarHasData = (
  solar: SolarModel | undefined,
): solar is SolarModel => {
  if (!solar) return false;
  if (solar.forecastSeries?.length || solar.tomorrowSeries?.length) return true;
  return SOLAR_VALUE_KEYS.some((key) => isFiniteNumber(solar[key]));
};

export const normalizeSub = (sub: string | null | undefined): SolarTab => {
  return SOLAR_TABS.includes(sub as SolarTab) ? (sub as SolarTab) : "overblik";
};

export const solarNumber = (
  solar: SolarModel | undefined,
  hass: ArcusHass,
  key: string,
  entityId: string | undefined,
): number | null => {
  const value = solar?.[key];
  if (isFiniteNumber(value)) return value;
  if (!entityId) return null;
  const state = hass.states?.[entityId]?.state;
  if (state === null || state === undefined || state === "") return null;
  const number = Number(state);
  return Number.isFinite(number) ? number : null;
};

export const historySeries = (
  history: HistoryCache,
  id: string | undefined,
  days: number,
  fill: number | "hold" | null = "hold",
  end?: number,
): Array<number | null> => {
  if (!id) return [];
  try {
    return history.window(id, days, { buckets: 96, fill, end }) ?? [];
  } catch {
    return [];
  }
};

const safeRaw = (
  history: HistoryCache,
  id: string | undefined,
): HistoryRow[] => {
  if (!id) return [];
  try {
    return history.raw(id) ?? [];
  } catch {
    return [];
  }
};

const rowTime = (row: HistoryRow): number => {
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
};

const localDayKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

export const pointDate = (point: SolarPoint): Date | null => {
  const raw = point.t as unknown;
  const date = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sameLocalDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export const pointsOnDate = (
  points: SolarPoint[] | undefined,
  date: Date,
): SolarPoint[] => {
  if (!Array.isArray(points)) return [];
  return points.filter((point) => {
    const parsed = pointDate(point);
    return parsed !== null && sameLocalDay(parsed, date);
  });
};

export const todayForecastValues = (solar: SolarModel, now: Date): number[] => {
  return pointsOnDate(solar.forecastSeries, now).map((point) => point.v);
};

export const forecast48Values = (solar: SolarModel, now: Date): number[] => {
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
};

export interface DayBarDatum {
  key: string;
  label: string;
  value: number;
  today: boolean;
}

/** The bars always show one week, whatever length the range control selects. */
const PRODUCTION_DAYS = 7;

/**
 * The seven local calendar days ending on the anchor day; `end` is the
 * exclusive midnight after it, so this matches the selected range's end.
 */
export const productionWindow = (
  end: number,
): { start: number; end: number } => {
  return {
    start: startOfDay(addDays(new Date(end - 1), -(PRODUCTION_DAYS - 1))),
    end,
  };
};

export const dailyProductionDays = (
  history: HistoryCache,
  entityId: string | undefined,
  end: number,
  language: Language,
  now: Date,
): DayBarDatum[] => {
  const rows = safeRaw(history, entityId);
  const { start } = productionWindow(end);
  const byDay = new Map<string, number>();
  for (const entry of rows) {
    const time = rowTime(entry);
    const value = rowValue(entry);
    if (!time || value === null || time < start || time >= end) continue;
    const key = localDayKey(new Date(time));
    byDay.set(key, Math.max(byDay.get(key) ?? 0, value));
  }
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-PRODUCTION_DAYS);
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
};

export const sumDelta = (
  history: HistoryCache,
  id: string | undefined,
  days: number,
  now: Date,
): number | null => {
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
};

export const installedAtValue = (
  solar: SolarModel | undefined,
  hass: ArcusHass,
  config: ArcusConfig,
  language: Language,
): string => {
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
};

/** Entity ids the active tab's history charts read. */
export const historyIdsFor = (
  config: SolarConfig | undefined,
  sub: SolarTab,
): string[] => {
  if (!config) return [];

  const ids = new Set<string>();
  const add = (id?: string) => {
    if (id) ids.add(id);
  };

  if (sub === "overblik") {
    add(config.load);
    add(config.batteryPower);
    add(config.grid);
    add(config.gridL1);
    add(config.gridL2);
    add(config.gridL3);
  } else if (sub === "produktion") {
    add(config.today);
    add(config.power);
    add(config.pv1);
    add(config.pv2);
    add(config.pv3);
    add(config.pv4);
  } else if (sub === "batteri") {
    add(config.batterySoc);
    add(config.batteryCharge);
    add(config.batteryDischarge);
  } else if (sub === "afkast") {
    add(config.savingsTotal);
  }

  return [...ids];
};

export const ensureHistory = (
  history: HistoryCache,
  config: SolarConfig | undefined,
  sub: SolarTab,
): void => {
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
    request(historyIdsFor(config, sub), 24 * 365);
    return;
  }

  // Preload every non-payback tab so switching tabs is instant.
  const tabs: readonly SolarTab[] = ["overblik", "produktion", "batteri"];
  const preload = tabs.flatMap((tab) => historyIdsFor(config, tab));
  request([...new Set(preload)], 24 * 7);
};

/** Local calendar-day bounds for the day containing `date`. */
export const dayWindow = (date: Date): { start: number; end: number } => {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  return { start, end: start + DAY_MS };
};

/**
 * A fixed-length window ending at `end`; the same arithmetic as
 * `history.window(id, days, { end })`, so the chart axis matches the series.
 */
export const endWindow = (
  end: number,
  days: number,
): { start: number; end: number } => {
  return { start: end - days * DAY_MS, end };
};

/**
 * History series bucketed across the selected range. Buckets after `now` are
 * nulled so a live window stops at the present instead of holding the last
 * value through the future.
 */
export const historyDaySeries = (
  history: HistoryCache,
  id: string | undefined,
  range: ResolvedHistoryRange,
  now: Date,
  fill: number | "hold" | null = "hold",
): Array<number | null> => {
  if (!id) return [];
  try {
    const values =
      history.series(id, {
        start: range.start,
        end: range.end,
        buckets: 96,
        fill,
      }) ?? [];
    return clipSeries(values, 96, range, now);
  } catch {
    return [];
  }
};

/** Fraction of the local day for an instant, 0 at midnight and 1 at 24:00. */
export const dayFraction = (date: Date): number => {
  return (
    (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) /
    86_400
  );
};
