import { formatNumber } from "../../format";
import { areaPath, sparkPath } from "../../render/charts";
import { graphAttrs } from "../../render/graph";
import { icon } from "../../render/icons";
import type { ArcusConfig, HomeModel, Translator } from "../../types";
import type { LayerContext, SheetApp } from "./types";

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
  opts: { lead?: string } = {},
): string {
  return `<div class="row">${opts.lead ?? ""}<div class="row-main"><div class="row-name">${name}</div>${
    sub ? `<div class="row-sub">${sub}</div>` : ""
  }</div>${right}</div>`;
}

function historyWindow(
  ctx: LayerContext,
  entityId: string | undefined,
  days: number,
): Array<number | null> {
  if (!entityId) return [];
  const history = ctx.history as unknown as
    { window?: (id: string, days: number) => Array<number | null> } | undefined;
  return typeof history?.window === "function"
    ? history.window(entityId, days)
    : [];
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
  const gradientId = `economy-chart-${chartSequence++}`;
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
        start: now - 30 * 86_400_000,
        end: now,
        unit: "",
        decimals: 2,
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

/**
 * Economy: the bond price, today's change, effective yield, duration and the
 * 30-day price chart from the history cache.
 */
export function renderEconomySheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const economy = model.economy;
  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 2) =>
    formatNumber(value, digits, language);
  const signed = (value: number | null | undefined) =>
    value === null || value === undefined
      ? "–"
      : `${value >= 0 ? "+" : ""}${fmt(value, 2)}`;

  if (!economy) {
    return `${header(
      ctx,
      t("sheet.kickerEconomy"),
      t("sheet.titleEconomy"),
      "–",
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "chart",
    )}<span>${esc(t("empty.data"))}</span></div></div>`;
  }

  const value = economy.value ?? null;
  const change = economy.change ?? null;
  const yieldValue = economy.yield ?? null;
  const duration = economy.duration ?? null;
  const bondId = config.economy?.bond;
  const bondSeries = historyWindow(ctx, bondId, 30);
  const yearsUnit = language === "da" ? "år" : "yr";

  return `${header(
    ctx,
    t("sheet.kickerEconomy"),
    t("sheet.titleEconomy"),
    t("economy.summary", {
      price: fmt(value, 2),
      change: signed(change),
    }),
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="big-read">${fmt(value, 2)}<small>${t(
        "economy.price",
      )}</small></div>
      <div class="block-note">${signed(change)} % ${esc(
        t("common.today").toLocaleLowerCase(),
      )}</div>
    </div>
    <div class="readings">
      ${read(t("economy.change"), signed(change), "%")}
      ${read(t("economy.effectiveYield"), fmt(yieldValue, 3), "%")}
      ${read(t("economy.duration"), fmt(duration, 2), yearsUnit)}
      ${read(t("economy.price"), fmt(value, 2), "")}
    </div>
    <div class="block">
      <div class="block-label">${t("economy.chart30")}</div>
      ${chartBox(
        [{ key: "bond", values: bondSeries, color: "var(--brass)" }],
        150,
        t,
      )}
    </div>
    <div class="block">
      <div class="block-label">${t("economy.metrics")}</div>
      <div class="list">
        ${row(
          t("economy.price"),
          t("economy.latest"),
          `<span class="row-val">${fmt(value, 2)}</span>`,
          { lead: icon("chart") },
        )}
        ${row(
          t("economy.changeToday"),
          "",
          `<span class="row-val">${signed(change)}<small>%</small></span>`,
          { lead: icon("arrow") },
        )}
        ${row(
          t("economy.effectiveYield"),
          "",
          `<span class="row-val">${fmt(yieldValue, 3)}<small>%</small></span>`,
          { lead: icon("percent") },
        )}
        ${row(
          t("economy.duration"),
          "",
          `<span class="row-val">${fmt(duration, 2)}<small>${yearsUnit}</small></span>`,
          { lead: icon("clock") },
        )}
      </div>
    </div>
    <div class="note">${t("economy.footer")}</div>
  </div>`;
}
