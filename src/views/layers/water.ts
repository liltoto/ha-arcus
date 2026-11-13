import { formatNumber } from "../../format";
import { areaPath, sparkPath } from "../../render/charts";
import { graphAttrs } from "../../render/graph";
import { icon } from "../../render/icons";
import type { ArcusConfig, HomeModel, Translator } from "../../types";
import type { LayerContext, SheetApp } from "./types";

/**
 * The sheet element talks to the card through `SheetApp`. The card also has
 * live-state helpers from the prototype; they are optional here so a sheet can
 * be rendered from a plain model in tests and in the editor preview.
 */
interface RichSheetApp extends SheetApp {
  _get?: (
    entityId: string,
  ) => { state?: string; attributes?: Record<string, any> } | null | undefined;
  _on?: (entityId: string) => boolean;
  _state?: (entityId: string) => string | null | undefined;
  _n?: (entityId: string, fallback?: number | null) => number | null;
}

interface ChartSeries {
  key: string;
  values: Array<number | null>;
  color: string;
  label?: string;
  unit?: string;
  decimals?: number;
}

let chartSequence = 0;

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function languageOf(model: HomeModel, config: ArcusConfig): "da" | "en" {
  return model.language === "en" || config.language === "en" ? "en" : "da";
}

function header(
  ctx: LayerContext,
  kicker: string,
  title: string,
  summary: string,
): string {
  const app = ctx.app as Partial<SheetApp> | undefined;
  if (app && typeof app._sheetHeader === "function") {
    return app._sheetHeader(kicker, title, summary);
  }
  return `<div class="sheet-head"><div class="eyebrow">${esc(
    kicker,
  )}</div><h2>${esc(title)}</h2><p>${esc(summary)}</p></div>`;
}

function read(label: string, value: string, unit = ""): string {
  return `<div class="reading"><div class="v"><span>${value}</span><small>${unit}</small></div><div class="l">${label}</div></div>`;
}

function row(
  name: string,
  sub: string,
  right: string,
  opts: { lead?: string; cls?: string; nav?: string } = {},
): string {
  const nav = opts.nav ? ` data-nav="${esc(opts.nav)}"` : "";
  return `<div class="row ${opts.cls ?? ""}"${nav}>${opts.lead ?? ""}<div class="row-main"><div class="row-name">${name}</div>${
    sub ? `<div class="row-sub">${sub}</div>` : ""
  }</div>${right}</div>`;
}

function historySeries(
  ctx: LayerContext,
  entityId: string | undefined,
): Array<number | null> {
  if (!entityId) return [];
  const history = ctx.history as unknown as
    { series?: (id: string) => Array<number | null> } | undefined;
  return typeof history?.series === "function" ? history.series(entityId) : [];
}

function chartBox(
  series: ChartSeries[],
  height: number,
  t: Translator,
  shared = series.length > 1,
): string {
  const hasData = series.some((entry) =>
    entry.values.some(
      (value) => typeof value === "number" && Number.isFinite(value),
    ),
  );
  const gradientId = `water-chart-${chartSequence++}`;
  let range: { min: number; max: number } | null = null;
  if (shared) {
    const values = series
      .flatMap((entry) => entry.values)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );
    if (values.length) {
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (max === min) {
        min -= 1;
        max += 1;
      }
      range = { min, max };
    }
  }
  const first = series[0];
  const area = first ? areaPath(first.values, 560, height, 2, range) : "";
  const lines = series
    .map(
      (entry) =>
        `<path fill="none" stroke="${entry.color}" stroke-width="1.5" vector-effect="non-scaling-stroke" d="${sparkPath(
          entry.values,
          560,
          height,
          2,
          shared ? range : null,
        )}"/>`,
    )
    .join("");
  const now = Date.now();
  const graph = hasData
    ? graphAttrs({
        start: now - 86_400_000,
        end: now,
        unit: "L/min",
        decimals: 1,
        series: series.map((entry) => ({
          label: entry.label,
          color: entry.color,
          values: entry.values,
          unit: entry.unit,
          decimals: entry.decimals,
        })),
      })
    : "";
  return `<div class="chart-box ${hasData ? "" : "no-data"}" ${graph}>
    <svg viewBox="0 0 560 ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${
        first?.color ?? "var(--accent)"
      }" stop-opacity=".26"/><stop offset="1" stop-color="${
        first?.color ?? "var(--accent)"
      }" stop-opacity="0"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75]
        .map(
          (part) =>
            `<line x1="0" y1="${height * part}" x2="560" y2="${
              height * part
            }" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`,
        )
        .join("")}
      <path fill="url(#${gradientId})" d="${area}"/>
      ${lines}
    </svg>
    <span class="chart-empty">${esc(t("empty.chart"))}</span>
  </div>`;
}

function isOn(ctx: LayerContext, entityId: string): boolean | null {
  const app = ctx.app as RichSheetApp | undefined;
  if (app && typeof app._on === "function") return app._on(entityId);
  if (app && typeof app._state === "function") {
    const state = app._state(entityId);
    if (state === "on" || state === "open") return true;
    if (state === "off" || state === "closed") return false;
  }
  if (app && typeof app._get === "function") {
    const state = app._get(entityId)?.state;
    if (state === "on" || state === "open") return true;
    if (state === "off" || state === "closed") return false;
  }
  if (app && typeof app._n === "function") {
    const value = app._n(entityId, null);
    if (value !== null) return value > 0;
  }
  return null;
}

function entityName(
  ctx: LayerContext,
  entityId: string,
  index: number,
): string {
  const app = ctx.app as RichSheetApp | undefined;
  const friendly = app?._get?.(entityId)?.attributes?.friendly_name;
  if (typeof friendly === "string" && friendly.trim()) return friendly;
  if (index === 0) return ctx.t("water.kitchen");
  if (index === 1) return ctx.t("water.utility");
  return `${ctx.t("water.leak")} ${index + 1}`;
}

function toggle(ctx: LayerContext, entityId: string, on: boolean): string {
  return `<button class="toggle ${on ? "on" : ""}" data-act="toggle-bool" data-entity="${esc(
    entityId,
  )}" data-on="${esc(entityId)}" aria-label="${esc(
    ctx.t("common.toggle"),
  )}"></button>`;
}

/**
 * Water: BWT softener, usage, leaks and the 24-hour flow chart.
 *
 * Every value comes from `model.water`; the optional live-state helpers are
 * only used for controls (holiday mode and the leak sensors) because those
 * states are not part of the resolved water model.
 */
export function renderWaterSheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const water = model.water;
  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 1) =>
    formatNumber(value, digits, language);

  if (!water) {
    return `${header(
      ctx,
      t("sheet.kickerWater"),
      t("sheet.titleWater"),
      "–",
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "drop",
    )}<span>${esc(t("empty.data"))}</span></div></div>`;
  }

  const day = water.day ?? null;
  const month = water.month ?? null;
  const total = water.total ?? null;
  const cost = water.cost ?? null;
  const flow = water.flow ?? null;
  const salt = water.salt ?? null;
  const saltDays = water.saltDays ?? null;
  const capacity = water.capacity ?? null;
  const state = water.state || "–";
  const holidayId = config.water?.holiday;
  const holidayOn = holidayId
    ? (isOn(ctx, holidayId) ?? Boolean(water.holiday))
    : Boolean(water.holiday);

  const leakIds = config.security?.leaks ?? [];
  const leakRows = leakIds
    .map((entityId, index) => {
      const on = isOn(ctx, entityId) ?? Boolean(model.security?.leak);
      return row(
        esc(entityName(ctx, entityId, index)),
        on ? esc(t("water.waterDetected")) : esc(t("water.noWater")),
        `<span class="status-line"><i class="dot ${
          on ? "warn" : ""
        }"></i>${on ? t("water.alarm") : t("common.ok")}</span>`,
        {
          lead: icon("drop"),
          nav: "vand",
        },
      );
    })
    .join("");

  const leakBattery = model.security?.batteries?.find((battery) =>
    /klippbok|water|leak/i.test(battery.entityId),
  );

  const flowId = config.water?.flow;
  const flowSeries = historySeries(ctx, flowId);

  return `${header(
    ctx,
    t("sheet.kickerWater"),
    t("sheet.titleWater"),
    t("water.summary", {
      day: fmt(day, 1),
      state,
      salt: fmt(salt, 0),
    }),
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="big-read">${fmt(day, 1)}<small>L ${esc(
        t("common.today").toLocaleLowerCase(),
      )}</small></div>
      <div class="block-note">${
        month !== null || total !== null
          ? t("water.note", {
              month: fmt(month, 0),
              total: fmt(total === null ? null : total / 1000, 1),
            })
          : esc(t("empty.data"))
      }</div>
    </div>
    <div class="readings">
      ${read(t("water.thisMonth"), fmt(month, 0), "L")}
      ${read(
        t("water.total"),
        fmt(total === null ? null : total / 1000, 1),
        "m³",
      )}
      ${read(t("water.cost"), fmt(cost, 0), "kr")}
      ${read(t("water.flowNow"), fmt(flow, 2), "m³/h")}
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">${t(
        "water.bwt",
      )}</div><div class="block-label"><b>${esc(state)}</b></div></div>
      <div class="readings">
        ${read(t("water.salt"), fmt(salt, 0), "%")}
        ${read(t("water.daysLeft"), fmt(saltDays, 0), t("water.days"))}
        ${read(t("water.capacity"), fmt(capacity, 0), "L")}
        ${read(t("water.flow"), fmt(flow, 2), "m³/h")}
      </div>
      ${
        holidayId
          ? `<div class="row"><span class="row-main"><div class="row-name">${t(
              "water.holiday",
            )}</div><div class="row-sub">${t(
              "water.holidaySub",
            )}</div></span>${toggle(ctx, holidayId, holidayOn)}</div>`
          : ""
      }
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">${t(
        "water.leak",
      )}</div><div class="block-label"><b>${
        model.security?.leak ? t("water.alarm") : t("water.allDry")
      }</b></div></div>
      ${leakRows || `<div class="block-note">${esc(t("empty.data"))}</div>`}
      ${
        leakBattery
          ? row(
              esc(t("water.battery")),
              esc(t("water.leakBattery")),
              `<span class="row-val">${
                leakBattery.level === null ? "–" : fmt(leakBattery.level, 0)
              }<small>%</small></span>`,
              { lead: icon("battery") },
            )
          : ""
      }
    </div>
    <div class="block">
      <div class="block-label">${t("water.flow24")}</div>
      ${chartBox(
        [{ key: "flow", values: flowSeries, color: "var(--sky)" }],
        110,
        t,
      )}
    </div>
    <div class="note">${t("water.footer")}</div>
  </div>`;
}
