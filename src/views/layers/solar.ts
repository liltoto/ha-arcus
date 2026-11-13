import type { HistoryRow } from "../../data/history";
import { formatNumber } from "../../format";
import { areaPath, sparkPath } from "../../render/charts";
import { icon } from "../../render/icons";
import type {
  HassEntity,
  Language,
  SolarModel,
  SolarPoint,
  SolarTab,
  Translator,
} from "../../types";
import type { LayerContext, SheetApp } from "./types";

interface SolarApp extends SheetApp {
  _now?(): Date;
  _n?(
    entityId: string | null | undefined,
    fallback?: number | null,
  ): number | null;
  _get?(entityId: string | null | undefined): HassEntity | null | undefined;
}

interface ChartSeries {
  key: string;
  values: Array<number | null>;
  color: string;
}

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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function localeFor(language: Language): string {
  return language === "da" ? "da-DK" : "en-GB";
}

function languageOf(ctx: LayerContext): Language {
  const modelLanguage = (ctx.model as { language?: unknown }).language;
  if (modelLanguage === "da" || modelLanguage === "en") return modelLanguage;
  if (ctx.config.language === "da" || ctx.config.language === "en") {
    return ctx.config.language;
  }
  return ctx.t("common.today") === "I dag" ? "da" : "en";
}

function nowOf(ctx: LayerContext): Date {
  const app = ctx.app as SolarApp;
  try {
    const value = app._now?.();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    /* fall through to the wall clock */
  }
  return new Date();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function fmt(
  value: number | null | undefined,
  digits: number,
  language: Language,
): string {
  return formatNumber(value, digits, language);
}

/** Card chart keys for a rolling 24-hour window. */
function windowKey(entityId: string | undefined): string {
  return `24:${entityId ?? ""}`;
}

/** Card chart keys for the full cached history (7 days / 1 year). */
function entityKey(entityId: string | undefined): string {
  return entityId ?? "";
}

function solarNumber(
  ctx: LayerContext,
  key: string,
  entityId?: string,
): number | null {
  const value = ctx.model.solar?.[key];
  if (isFiniteNumber(value)) return value;
  const app = ctx.app as SolarApp;
  const fallback = entityId ? app._n?.(entityId) : null;
  return isFiniteNumber(fallback) ? fallback : null;
}

function reading(label: string, value: string, unit: string): string {
  return `<div class="reading"><div class="v">${value}${
    unit ? `<small>${escapeHtml(unit)}</small>` : ""
  }</div><div class="l">${escapeHtml(label)}</div></div>`;
}

function miniStat(
  label: string,
  value: string,
  unit: string,
  sub: string,
): string {
  return `<div class="mini-stat"><div class="k">${escapeHtml(
    label,
  )}</div><div class="v">${value}${
    unit ? `<small>${escapeHtml(unit)}</small>` : ""
  }</div><div class="row-sub">${escapeHtml(sub)}</div></div>`;
}

function row(name: string, sub: string, right: string): string {
  return `<div class="row"><span class="row-main"><div class="row-name">${escapeHtml(
    name,
  )}</div>${
    sub ? `<div class="row-sub">${escapeHtml(sub)}</div>` : ""
  }</span>${right}</div>`;
}

function stepper(
  entityId: string,
  act: string,
  step: number,
  value: number | null,
  language: Language,
  digits = 0,
): string {
  return `<div class="stepper"><button data-act="${escapeHtml(
    act,
  )}" data-entity="${escapeHtml(
    entityId,
  )}" data-step="${step}" data-dir="-1" aria-label="−">${icon(
    "minus",
  )}</button><span class="val">${fmt(
    value,
    digits,
    language,
  )}</span><button data-act="${escapeHtml(act)}" data-entity="${escapeHtml(
    entityId,
  )}" data-step="${step}" data-dir="1" aria-label="+">${icon(
    "plus",
  )}</button></div>`;
}

function controlRow(
  name: string,
  sub: string,
  entityId: string | undefined,
  act: string,
  step: number,
  value: number | null,
  language: Language,
  digits = 0,
): string {
  const control = entityId
    ? stepper(entityId, act, step, value, language, digits)
    : `<span class="row-val">${fmt(value, digits, language)}</span>`;
  return row(name, sub, control);
}

function chartBox(
  t: Translator,
  chart: string,
  series: ChartSeries[],
  height: number,
  options: { shared?: boolean; empty?: string } = {},
): string {
  const shared = options.shared ?? series.length > 1;
  const valid = series.flatMap((item) => item.values).filter(isFiniteNumber);
  const range =
    shared && valid.length
      ? { min: Math.min(...valid), max: Math.max(...valid) }
      : null;
  const gradientId = `g${chart.replace(/[^a-z0-9]/gi, "")}`;
  const grid = [0.25, 0.5, 0.75]
    .map((part) => {
      const y = (height * part).toFixed(1);
      return `<line x1="0" y1="${y}" x2="560" y2="${y}" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    })
    .join("");
  const first = series[0];
  const area = first ? areaPath(first.values, 560, height, 6, range) : "";
  const lines = series
    .map((item) => {
      const path = sparkPath(item.values, 560, height, 6, range);
      return `<path data-chart-line="${escapeHtml(
        item.key,
      )}" fill="none" stroke="${escapeHtml(
        item.color,
      )}" stroke-width="1.5" vector-effect="non-scaling-stroke" d="${path}"/>`;
    })
    .join("");
  const noData = valid.length === 0;
  const points = Math.max(0, ...series.map((item) => item.values.length));
  return `<div class="chart-box${
    noData ? " no-data" : ""
  }" data-chart="${escapeHtml(chart)}" data-points="${points}">
    <svg viewBox="0 0 560 ${height}" preserveAspectRatio="none" data-chart-shared="${
      shared ? "1" : "0"
    }" aria-hidden="true">
      <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${escapeHtml(
          first?.color ?? "var(--accent)",
        )}" stop-opacity=".26"/>
        <stop offset="1" stop-color="${escapeHtml(
          first?.color ?? "var(--accent)",
        )}" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}
      ${
        first && area
          ? `<path data-chart-area="${escapeHtml(
              first.key,
            )}" fill="url(#${gradientId})" d="${area}"/>`
          : ""
      }
      ${lines}
    </svg>
    <span class="chart-empty">${escapeHtml(
      options.empty ?? t("empty.chart"),
    )}</span>
  </div>`;
}

function solarHasData(solar: SolarModel | undefined): solar is SolarModel {
  if (!solar) return false;
  if (solar.forecastSeries?.length || solar.tomorrowSeries?.length) return true;
  return SOLAR_VALUE_KEYS.some((key) => isFiniteNumber(solar[key]));
}

function normalizeSub(sub: string | null | undefined): SolarTab {
  return SOLAR_TABS.includes(sub as SolarTab) ? (sub as SolarTab) : "overblik";
}

function ensureHistory(ctx: LayerContext, sub: SolarTab): void {
  const config = ctx.config.solar;
  if (!config) return;

  const request = (ids: string[], hours: number) => {
    if (!ids.length) return;
    try {
      const pending = ctx.history.ensure(ids, hours);
      if (pending && typeof (pending as Promise<void>).catch === "function") {
        (pending as Promise<void>).catch(() => {
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

function historySeries(
  ctx: LayerContext,
  id: string | undefined,
  days: number,
): Array<number | null> {
  if (!id) return [];
  try {
    return ctx.history.window(id, days) ?? [];
  } catch {
    return [];
  }
}

function safeRaw(ctx: LayerContext, id: string): HistoryRow[] {
  try {
    return ctx.history.raw(id) ?? [];
  } catch {
    return [];
  }
}

function rowTime(row: HistoryRow): number {
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

function rowValue(row: HistoryRow): number | null {
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

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function pointDate(point: SolarPoint): Date | null {
  const raw = point.t as unknown;
  const date = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pointsOnDate(
  points: SolarPoint[] | undefined,
  date: Date,
): SolarPoint[] {
  if (!Array.isArray(points)) return [];
  return points.filter((point) => {
    const parsed = pointDate(point);
    return parsed !== null && sameLocalDay(parsed, date);
  });
}

function todayForecastValues(solar: SolarModel, now: Date): number[] {
  return pointsOnDate(solar.forecastSeries, now).map((point) => point.v);
}

function forecast48Values(solar: SolarModel, now: Date): number[] {
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

function dailyProductionBars(
  ctx: LayerContext,
  now: Date,
  language: Language,
): string {
  const id = ctx.config.solar?.today;
  const rows = id ? safeRaw(ctx, id) : [];
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
  if (!days.length) {
    return `<div class="day-bars" data-bars="solarWeek"><span class="day-empty">${escapeHtml(
      ctx.t("empty.dataYet"),
    )}</span></div>`;
  }
  const max = Math.max(...days.map(([, value]) => value), 1);
  const todayKey = localDayKey(now);
  const weekday = new Intl.DateTimeFormat(localeFor(language), {
    weekday: "short",
  });
  const bars = days
    .map(([key, value]) => {
      const date = new Date(`${key}T12:00:00`);
      const label = weekday.format(date).replace(/\.$/, "");
      return `<div class="day${
        key === todayKey ? " today" : ""
      }"><div class="val">${fmt(value, 1, language)}</div><div class="bar" style="height:${Math.max(
        4,
        (value / max) * 100,
      ).toFixed(1)}%"></div><div class="day-label">${escapeHtml(
        label,
      )}</div></div>`;
    })
    .join("");
  return `<div class="day-bars" data-bars="solarWeek">${bars}</div>`;
}

function sumDelta(
  ctx: LayerContext,
  id: string | undefined,
  days: number,
  now: Date,
): number | null {
  if (!id) return null;
  const rows = safeRaw(ctx, id);
  const cutoff =
    days === 1
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      : now.getTime() - days * 86_400_000;
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

function installedAtValue(ctx: LayerContext, language: Language): string {
  const modelValue = ctx.model.solar?.installedAt;
  const app = ctx.app as SolarApp;
  const entityId = ctx.config.solar?.installedAt;
  const stateValue = entityId ? app._get?.(entityId)?.state : undefined;
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

function heliosLink(ctx: LayerContext): string {
  const path = ctx.config.solar?.heliosPath;
  if (!path) return "";
  return `<button class="btn" data-act="helios">${icon("solar")} ${escapeHtml(
    ctx.t("solar.helios"),
  )}</button>`;
}

function energyFlow(
  ctx: LayerContext,
  solar: SolarModel,
  language: Language,
): string {
  const t = ctx.t;
  const grid = solar.grid;
  const gridValue = grid === null ? "–" : fmt(Math.abs(grid), 0, language);
  const gridUnit =
    grid !== null && grid < 0 ? t("solar.flowBuy") : t("solar.flowSell");
  return `<div class="flow-wrap solar-flow">
    <svg viewBox="0 0 560 132" aria-hidden="true">
      <defs><marker id="ar-solar" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="var(--line-strong)"/></marker></defs>
      <path d="M102 66 H168" stroke="var(--amber)" stroke-width="1.2" marker-end="url(#ar-solar)" stroke-dasharray="4 5"/>
      <path d="M252 66 H310" stroke="var(--line-strong)" stroke-width="1.2" marker-end="url(#ar-solar)" stroke-dasharray="4 5"/>
      <path d="M390 66 H452" stroke="var(--sky)" stroke-width="1.2" marker-end="url(#ar-solar)" stroke-dasharray="4 5"/>
      <circle cx="70" cy="66" r="30" fill="none" stroke="var(--amber)" stroke-width="1"/>
      <circle cx="210" cy="66" r="40" fill="none" stroke="var(--line-strong)" stroke-width="1"/>
      <circle cx="350" cy="66" r="30" fill="none" stroke="var(--sky)" stroke-width="1"/>
      <circle cx="490" cy="66" r="30" fill="none" stroke="var(--sage)" stroke-width="1"/>
      <text x="70" y="28" class="flow-label" text-anchor="middle">${escapeHtml(
        t("solar.flowSolar"),
      )}</text>
      <text x="70" y="64" class="flow-val" text-anchor="middle" data-flow="pv">${fmt(
        solar.power,
        0,
        language,
      )}</text>
      <text x="70" y="78" class="flow-unit" text-anchor="middle">${escapeHtml(
        t("solar.flowWatt"),
      )}</text>
      <text x="210" y="20" class="flow-label" text-anchor="middle">${escapeHtml(
        t("solar.flowBattery"),
      )}</text>
      <text x="210" y="66" class="flow-val" text-anchor="middle" data-flow="soc">${fmt(
        solar.batterySoc,
        0,
        language,
      )}</text>
      <text x="210" y="80" class="flow-unit" text-anchor="middle">${escapeHtml(
        t("solar.flowPercent"),
      )}</text>
      <text x="350" y="28" class="flow-label" text-anchor="middle">${escapeHtml(
        t("solar.flowHouse"),
      )}</text>
      <text x="350" y="64" class="flow-val" text-anchor="middle" data-flow="load">${fmt(
        solar.load,
        0,
        language,
      )}</text>
      <text x="350" y="78" class="flow-unit" text-anchor="middle">${escapeHtml(
        t("solar.flowWatt"),
      )}</text>
      <text x="490" y="28" class="flow-label" text-anchor="middle">${escapeHtml(
        t("solar.flowGrid"),
      )}</text>
      <text x="490" y="64" class="flow-val" text-anchor="middle" data-flow="grid">${gridValue}</text>
      <text x="490" y="78" class="flow-unit" text-anchor="middle">${escapeHtml(
        gridUnit,
      )}</text>
    </svg>
  </div>`;
}

function solarOverview(
  ctx: LayerContext,
  solar: SolarModel,
  language: Language,
  now: Date,
): string {
  const t = ctx.t;
  const config = ctx.config.solar;
  const grid = solar.grid;
  const gridLabel =
    grid !== null && grid < 0 ? t("solar.gridBuy") : t("solar.gridSell");
  return `<div class="readings">
    ${reading(t("solar.battery"), fmt(solar.batterySoc, 0, language), "%")}
    ${reading(t("solar.today"), fmt(solar.today, 1, language), t("energy.kwh"))}
    ${reading(
      t("solar.productionNow"),
      fmt(solar.power, 0, language),
      t("energy.w"),
    )}
    ${reading(t("solar.load"), fmt(solar.load, 0, language), t("energy.w"))}
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.flow"))}</div>
    ${energyFlow(ctx, solar, language)}
  </div>
  <div class="block">
    <div class="block-head"><div class="block-label">${escapeHtml(
      t("solar.power24"),
    )}</div><div class="legend"><span><i style="--c:var(--amber)"></i>${escapeHtml(
      t("solar.legendSolar"),
    )}</span><span><i style="--c:var(--sky)"></i>${escapeHtml(
      t("solar.legendHouse"),
    )}</span><span><i style="--c:var(--sage)"></i>${escapeHtml(
      t("solar.legendBattery"),
    )}</span><span><i style="--c:var(--muted)"></i>${escapeHtml(
      t("solar.legendGrid"),
    )}</span></div></div>
    ${chartBox(
      t,
      "solar-24h",
      [
        {
          key: "solarForecast",
          values: todayForecastValues(solar, now),
          color: "var(--amber)",
        },
        {
          key: windowKey(config?.load),
          values: historySeries(ctx, config?.load, 1),
          color: "var(--sky)",
        },
        {
          key: windowKey(config?.batteryPower),
          values: historySeries(ctx, config?.batteryPower, 1),
          color: "var(--sage)",
        },
        {
          key: windowKey(config?.grid),
          values: historySeries(ctx, config?.grid, 1),
          color: "var(--muted)",
        },
      ],
      150,
      { shared: true },
    )}
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.gridPhases"))}</div>
    <div class="readings">${reading(
      "L1",
      fmt(solar.gridL1, 1, language),
      "A",
    )}${reading("L2", fmt(solar.gridL2, 1, language), "A")}${reading(
      "L3",
      fmt(solar.gridL3, 1, language),
      "A",
    )}${reading(
      gridLabel,
      fmt(grid === null ? null : Math.abs(grid), 0, language),
      t("energy.w"),
    )}</div>
    ${chartBox(
      t,
      "solar-grid-24h",
      [
        {
          key: windowKey(config?.gridL1),
          values: historySeries(ctx, config?.gridL1, 1),
          color: "var(--sky)",
        },
        {
          key: windowKey(config?.gridL2),
          values: historySeries(ctx, config?.gridL2, 1),
          color: "var(--brass)",
        },
        {
          key: windowKey(config?.gridL3),
          values: historySeries(ctx, config?.gridL3, 1),
          color: "var(--plum)",
        },
      ],
      110,
      { shared: true },
    )}
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.mppt"))}</div>
    <div class="readings">${reading(
      t("solar.mppt3"),
      fmt(solar.pv3, 0, language),
      t("energy.w"),
    )}${reading(
      t("solar.mppt4"),
      fmt(solar.pv4, 0, language),
      t("energy.w"),
    )}${reading(
      t("solar.voltage3"),
      fmt(solar.pv3Voltage, 1, language),
      "V",
    )}${reading(
      t("solar.voltage4"),
      fmt(solar.pv4Voltage, 1, language),
      "V",
    )}</div>
    <div class="block-note">${escapeHtml(
      t("solar.mpptNote", {
        i3: fmt(solar.pv3Current, 1, language),
        i4: fmt(solar.pv4Current, 1, language),
      }),
    )}</div>
  </div>
  <div class="btn-row">${heliosLink(ctx)}<button class="btn small" data-nav="sol/produktion">${escapeHtml(
    t("sheet.tabProduction"),
  )}</button><button class="btn small" data-nav="sol/batteri">${escapeHtml(
    t("sheet.tabBattery"),
  )}</button><button class="btn small" data-nav="sol/prognose">${escapeHtml(
    t("sheet.tabForecast"),
  )}</button><button class="btn small" data-nav="sol/afkast">${escapeHtml(
    t("sheet.tabPayback"),
  )}</button></div>`;
}

function solarProduction(
  ctx: LayerContext,
  solar: SolarModel,
  language: Language,
  now: Date,
): string {
  const t = ctx.t;
  const config = ctx.config.solar;
  return `<div class="readings">${reading(
    t("solar.forecastToday"),
    fmt(solar.forecastToday, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.actualToday"),
    fmt(solar.today, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.thisMonth"),
    fmt(solar.month, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.thisYear"),
    fmt(solar.year, 1, language),
    t("energy.kwh"),
  )}</div>
  <div class="block">
    <div class="block-head"><div class="block-label">${escapeHtml(
      t("solar.productionVsForecast"),
    )}</div></div>
    ${chartBox(
      t,
      "solar-production-forecast",
      [
        {
          key: "solarForecast",
          values: todayForecastValues(solar, now),
          color: "var(--amber)",
        },
        {
          key: windowKey(config?.power),
          values: historySeries(ctx, config?.power, 1),
          color: "var(--text)",
        },
      ],
      150,
      { shared: true },
    )}
    <div class="legend"><span><i style="--c:var(--amber)"></i>${escapeHtml(
      t("solar.forecastToday"),
    )}</span><span><i style="--c:var(--text)"></i>${escapeHtml(
      t("solar.actual"),
    )}</span></div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.strings"))}</div>
    <div class="readings">${reading(
      t("solar.mppt3"),
      fmt(solar.pv3, 0, language),
      t("energy.w"),
    )}${reading(
      t("solar.mppt4"),
      fmt(solar.pv4, 0, language),
      t("energy.w"),
    )}${reading(
      t("solar.voltage3"),
      fmt(solar.pv3Voltage, 1, language),
      "V",
    )}${reading(
      t("solar.voltage4"),
      fmt(solar.pv4Voltage, 1, language),
      "V",
    )}</div>
    <div class="block-note">${escapeHtml(
      t("solar.mpptNote", {
        i3: fmt(solar.pv3Current, 1, language),
        i4: fmt(solar.pv4Current, 1, language),
      }),
    )}</div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.strings24"))}</div>
    ${chartBox(
      t,
      "solar-strings-24h",
      [
        {
          key: windowKey(config?.pv3),
          values: historySeries(ctx, config?.pv3, 1),
          color: "var(--brass)",
        },
        {
          key: windowKey(config?.pv4),
          values: historySeries(ctx, config?.pv4, 1),
          color: "var(--sky)",
        },
      ],
      110,
      { shared: true },
    )}
    <div class="legend"><span><i style="--c:var(--brass)"></i>${escapeHtml(
      t("solar.mppt3"),
    )}</span><span><i style="--c:var(--sky)"></i>${escapeHtml(
      t("solar.mppt4"),
    )}</span></div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.total"))}</div>
    <div class="readings">${reading(
      t("solar.totalProduced"),
      fmt(solar.totalProduction, 0, language),
      t("energy.kwh"),
    )}${reading(
      t("solar.thisMonth"),
      fmt(solar.month, 1, language),
      t("energy.kwh"),
    )}${reading(
      t("solar.thisYear"),
      fmt(solar.year, 1, language),
      t("energy.kwh"),
    )}${reading(
      t("solar.actualToday"),
      fmt(solar.today, 1, language),
      t("energy.kwh"),
    )}</div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.dailyEnergy7"))}</div>
    ${dailyProductionBars(ctx, now, language)}
  </div>`;
}

function solarBattery(
  ctx: LayerContext,
  solar: SolarModel,
  language: Language,
): string {
  const t = ctx.t;
  const config = ctx.config.solar;
  const minSoc = solarNumber(ctx, "batteryMinSoc", config?.batteryMinSoc);
  const maxSoc = solarNumber(ctx, "batteryMaxSoc", config?.batteryMaxSoc);
  return `<div class="block">
    <div class="big-read">${fmt(solar.batterySoc, 0, language)}<small>${escapeHtml(
      `% ${t("solar.battery").toLocaleLowerCase()}`,
    )}</small></div>
    <div class="block-note">${escapeHtml(t("solar.batteryNote"))}</div>
  </div>
  <div class="readings">${reading(
    t("solar.temperature"),
    fmt(solar.batteryTemperature, 1, language),
    "°C",
  )}${reading(
    t("solar.voltage"),
    fmt(solar.batteryVoltage, 1, language),
    "V",
  )}${reading(
    t("solar.current"),
    fmt(solar.batteryCurrent, 1, language),
    "A",
  )}${reading(
    t("solar.inverter"),
    fmt(solar.inverterTemperature, 1, language),
    "°C",
  )}</div>
  <div class="readings" style="margin-top:10px">${reading(
    t("solar.charge"),
    fmt(solar.batteryCharge, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.discharge"),
    fmt(solar.batteryDischarge, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.power"),
    fmt(solar.batteryPower, 0, language),
    t("energy.w"),
  )}${reading(t("solar.soc"), fmt(solar.batterySoc, 0, language), "%")}</div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.charge7"))}</div>
    ${chartBox(
      t,
      "solar-soc-7d",
      [
        {
          key: entityKey(config?.batterySoc),
          values: historySeries(ctx, config?.batterySoc, 7),
          color: "var(--sage)",
        },
      ],
      120,
    )}
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.chargeDischarge7"))}</div>
    ${chartBox(
      t,
      "solar-charge-7d",
      [
        {
          key: entityKey(config?.batteryCharge),
          values: historySeries(ctx, config?.batteryCharge, 7),
          color: "var(--sky)",
        },
        {
          key: entityKey(config?.batteryDischarge),
          values: historySeries(ctx, config?.batteryDischarge, 7),
          color: "var(--brass)",
        },
      ],
      110,
      { shared: true },
    )}
    <div class="legend"><span><i style="--c:var(--sky)"></i>${escapeHtml(
      t("solar.charge"),
    )}</span><span><i style="--c:var(--brass)"></i>${escapeHtml(
      t("solar.discharge"),
    )}</span></div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.limits"))}</div>
    ${controlRow(
      t("solar.minSoc"),
      "",
      config?.batteryMinSoc,
      "number-step",
      1,
      minSoc,
      language,
    )}
    ${controlRow(
      t("solar.maxSoc"),
      "",
      config?.batteryMaxSoc,
      "number-step",
      1,
      maxSoc,
      language,
    )}
  </div>
  <div class="note">${escapeHtml(t("solar.batteryFooter"))}</div>`;
}

function solarForecast(
  ctx: LayerContext,
  solar: SolarModel,
  language: Language,
  now: Date,
): string {
  const t = ctx.t;
  const diff =
    solar.forecastToday !== null &&
    solar.forecastToday > 0 &&
    solar.today !== null
      ? (solar.today / solar.forecastToday) * 100
      : null;
  return `<div class="readings">${reading(
    t("solar.today"),
    fmt(solar.forecastToday, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.forecastRemaining"),
    fmt(solar.forecastRemaining, 1, language),
    t("energy.kwh"),
  )}${reading(
    t("solar.forecastNow"),
    fmt(solar.forecastNow, 0, language),
    t("energy.w"),
  )}${reading(
    t("solar.forecastNextHour"),
    fmt(solar.forecastNextHour, 2, language),
    t("energy.kwh"),
  )}</div>
  <div class="mini-grid" style="margin-top:10px">${miniStat(
    t("solar.actualToday"),
    fmt(solar.today, 1, language),
    t("energy.kwh"),
    `${t("solar.forecastToday")} ${fmt(solar.forecastToday, 1, language)}`,
  )}${miniStat(
    t("solar.forecastVsActual"),
    fmt(diff, 0, language),
    "%",
    t("solar.forecastOfToday"),
  )}</div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.forecast48"))}</div>
    ${chartBox(
      t,
      "solar-48h",
      [
        {
          key: "solar48",
          values: forecast48Values(solar, now),
          color: "var(--amber)",
        },
      ],
      150,
    )}
    <div class="block-note">${escapeHtml(
      t("solar.forecastTodayNote", {
        hour: fmt(solar.forecastCurrentHour, 1, language),
        next: fmt(solar.forecastNext24h, 0, language),
      }),
    )}</div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.comingDays"))}</div>
    <div class="readings">${reading(
      t("common.tomorrow"),
      fmt(solar.forecastTomorrow, 1, language),
      t("energy.kwh"),
    )}${reading(
      t("solar.in2Days"),
      fmt(solar.forecastD2, 1, language),
      t("energy.kwh"),
    )}${reading(
      t("solar.in3Days"),
      fmt(solar.forecastD3, 1, language),
      t("energy.kwh"),
    )}${reading(
      t("common.today"),
      fmt(solar.forecastToday, 1, language),
      t("energy.kwh"),
    )}</div>
  </div>`;
}

function solarPayback(
  ctx: LayerContext,
  solar: SolarModel,
  language: Language,
  now: Date,
): string {
  const t = ctx.t;
  const config = ctx.config.solar;
  const investmentSolar = solarNumber(
    ctx,
    "investmentSolar",
    config?.investmentSolar,
  );
  const investmentBattery = solarNumber(
    ctx,
    "investmentBattery",
    config?.investmentBattery,
  );
  const investment =
    investmentSolar !== null || investmentBattery !== null
      ? (investmentSolar ?? 0) + (investmentBattery ?? 0)
      : null;
  const total = solar.savingsTotal;
  const left =
    investment !== null && typeof total === "number"
      ? Math.max(0, investment - total)
      : null;
  const rate = solar.savingsRate;
  const today = sumDelta(ctx, config?.savingsTotal, 1, now);
  const month = sumDelta(ctx, config?.savingsTotal, 30, now);
  const year = sumDelta(ctx, config?.savingsTotal, 365, now);
  const date =
    left !== null && typeof rate === "number" && rate > 0
      ? new Date(now.getTime() + (left / (rate * 24)) * 86_400_000)
      : null;
  const dateLabel = date
    ? new Intl.DateTimeFormat(localeFor(language), {
        month: "long",
        year: "numeric",
      }).format(date)
    : "–";
  return `<div class="block">
    <div class="big-read">${fmt(
      solar.paybackPercent,
      1,
      language,
    )}<small>${escapeHtml(
      t("solar.paybackPercent", { value: "" }).trim(),
    )}</small></div>
    <div class="block-note">${escapeHtml(
      t("solar.paybackTotalNote", {
        total: fmt(total, 0, language),
        rate: fmt(rate, 2, language),
      }),
    )}</div>
  </div>
  <div class="readings">${reading(
    t("common.today"),
    fmt(today, 0, language),
    t("energy.kr"),
  )}${reading(
    t("solar.thisMonth"),
    fmt(month, 0, language),
    t("energy.kr"),
  )}${reading(
    t("solar.thisYear"),
    fmt(year, 0, language),
    t("energy.kr"),
  )}${reading(
    t("solar.paybackLeft"),
    fmt(left, 0, language),
    t("energy.kr"),
  )}</div>
  <div class="mini-grid" style="margin-top:10px">${miniStat(
    t("sheet.titleSolar"),
    fmt(solar.savingsSolar, 0, language),
    t("energy.kr"),
    t("solar.paybackSavedTotal"),
  )}${miniStat(
    t("solar.battery"),
    fmt(solar.savingsBattery, 0, language),
    t("energy.kr"),
    t("solar.paybackSavedTotal"),
  )}</div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.paybackWhen"))}</div>
    <div class="big-read" style="font-size:40px">${escapeHtml(dateLabel)}</div>
    <div class="block-note">${escapeHtml(
      t("solar.paybackNote", {
        rate: fmt(rate, 2, language),
        investment: fmt(investment, 0, language),
      }),
    )}</div>
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.savings30"))}</div>
    ${chartBox(
      t,
      "solar-savings-30d",
      [
        {
          key: "savings30",
          values: historySeries(ctx, config?.savingsTotal, 30),
          color: "var(--sage)",
        },
      ],
      110,
    )}
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.savingsYear"))}</div>
    ${chartBox(
      t,
      "solar-savings-365d",
      [
        {
          key: "savings365",
          values: historySeries(ctx, config?.savingsTotal, 365),
          color: "var(--brass)",
        },
      ],
      110,
    )}
  </div>
  <div class="block">
    <div class="block-label">${escapeHtml(t("solar.settings"))}</div>
    ${controlRow(
      t("solar.investmentSolar"),
      "",
      config?.investmentSolar,
      "input-step",
      1000,
      investmentSolar,
      language,
    )}
    ${controlRow(
      t("solar.investmentBattery"),
      "",
      config?.investmentBattery,
      "input-step",
      1000,
      investmentBattery,
      language,
    )}
    ${row(
      t("solar.installed"),
      "",
      `<span class="row-val" style="font-size:13px">${escapeHtml(
        installedAtValue(ctx, language),
      )}</span>`,
    )}
  </div>
  <div class="note">${escapeHtml(t("solar.paybackFooter"))}</div>`;
}

function solarBody(
  ctx: LayerContext,
  sub: SolarTab,
  solar: SolarModel,
  language: Language,
  now: Date,
): string {
  if (sub === "produktion") {
    return solarProduction(ctx, solar, language, now);
  }
  if (sub === "batteri") {
    return solarBattery(ctx, solar, language);
  }
  if (sub === "prognose") {
    return solarForecast(ctx, solar, language, now);
  }
  if (sub === "afkast") {
    return solarPayback(ctx, solar, language, now);
  }
  return solarOverview(ctx, solar, language, now);
}

export function renderSolarSheet(
  ctx: LayerContext,
  sub?: string | null,
): string {
  const t = ctx.t;
  const language = languageOf(ctx);
  const now = nowOf(ctx);
  const solar = ctx.model.solar;
  const header = (summary: string) =>
    ctx.app._sheetHeader(
      t("sheet.kickerSolar"),
      t("sheet.titleSolar"),
      summary,
    );

  if (!solarHasData(solar)) {
    return `${header(escapeHtml(t("solar.empty")))}<div class="sheet-scroll"><div class="empty">${icon(
      "solar",
    )}<span>${escapeHtml(t("solar.empty"))}</span><span>${escapeHtml(
      t("empty.dataYet"),
    )}</span></div></div>`;
  }

  const active = normalizeSub(sub);
  ensureHistory(ctx, active);
  const tabs = [
    {
      key: "overblik",
      label: t("sheet.tabOverview"),
      route: "sol",
    },
    {
      key: "produktion",
      label: t("sheet.tabProduction"),
      route: "sol/produktion",
    },
    {
      key: "batteri",
      label: t("sheet.tabBattery"),
      route: "sol/batteri",
    },
    {
      key: "prognose",
      label: t("sheet.tabForecast"),
      route: "sol/prognose",
    },
    {
      key: "afkast",
      label: t("sheet.tabPayback"),
      route: "sol/afkast",
    },
  ];
  const summary = t("solar.summary", {
    soc: fmt(solar.batterySoc, 0, language),
    today: fmt(solar.today, 1, language),
    power: fmt(solar.power, 0, language),
  });
  return `${header(escapeHtml(summary))}${ctx.app._sheetTabs(
    tabs,
    active,
  )}<div class="sheet-scroll">${solarBody(
    ctx,
    active,
    solar,
    language,
    now,
  )}</div>`;
}
