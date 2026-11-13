import { formatPrice } from "../../format";
import { priceColor } from "../../render/charts";
import { icon } from "../../render/icons";
import type { HassEntity, Language, PriceModel } from "../../types";
import type { LayerContext, SheetApp } from "./types";

/**
 * The sheet contract only promises the model/config helpers. The card also
 * exposes the live-state helpers used by the legacy sheets, so they are read
 * structurally here instead of widening the shared interface for one layer.
 */
interface EnergyApp extends SheetApp {
  _now?(): Date;
  _n?(
    entityId: string | null | undefined,
    fallback?: number | null,
  ): number | null;
  _get?(entityId: string | null | undefined): HassEntity | null | undefined;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const app = ctx.app as EnergyApp;
  try {
    const value = app._now?.();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    /* fall through to the wall clock */
  }
  return new Date();
}

function hourLabel(hour: number): string {
  return String(Math.trunc(hour)).padStart(2, "0");
}

function liveNumber(
  ctx: LayerContext,
  entityId: string | undefined,
  fallback: number | null,
): number | null {
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback;
  }
  if (!entityId) return null;
  const app = ctx.app as EnergyApp;
  const value = app._n?.(entityId);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function liveOn(
  ctx: LayerContext,
  entityId: string | undefined,
  fallback: boolean | undefined,
): boolean {
  if (typeof fallback === "boolean") return fallback;
  if (!entityId) return false;
  const app = ctx.app as EnergyApp;
  const state = app._get?.(entityId)?.state;
  return state === "on" || state === "open";
}

function priceSection(ctx: LayerContext): PriceModel | undefined {
  const price = ctx.model.price;
  const energy = ctx.model.energy;
  if (price && Array.isArray(price.values) && price.values.length) {
    return price;
  }
  return energy ?? price;
}

function reading(label: string, value: string, unit: string): string {
  return `<div class="reading"><div class="v">${value}${
    unit ? `<small>${escapeHtml(unit)}</small>` : ""
  }</div><div class="l">${escapeHtml(label)}</div></div>`;
}

function listRow(name: string, sub: string, right: string, lead = ""): string {
  return `<div class="row">${lead}<div class="row-main"><div class="row-name">${escapeHtml(
    name,
  )}</div>${
    sub ? `<div class="row-sub">${escapeHtml(sub)}</div>` : ""
  }</div>${right}</div>`;
}

function priceBars(
  ctx: LayerContext,
  price: PriceModel,
  language: Language,
  nowHour: number,
): string {
  const values = price.values ?? [];
  if (!values.length) {
    return `<div class="empty">${icon("chart")}<span>${escapeHtml(
      ctx.t("empty.chart"),
    )}</span></div>`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bars = values
    .map((value, index) => {
      const height = Math.max(8, ((value - min) / (max - min || 1)) * 100);
      const title = `${ctx.t("energy.hourRange", {
        start: hourLabel(index),
        end: hourLabel(index + 1),
      })} · ${formatPrice(value, language)} ${ctx.t("energy.kr")}`;
      return `<i class="${index === nowHour ? "now" : ""}" style="height:${height.toFixed(
        1,
      )}%;background:${priceColor(value, min, max)}" title="${escapeHtml(
        title,
      )}"></i>`;
    })
    .join("");
  return `<div class="bar-chart">${bars}</div><div class="chart-cap"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>`;
}

/**
 * The energy sheet is built from the typed price model only. Tesla, standby,
 * and appliance readings have no typed model section or config entity mapping
 * yet; hardcoding the legacy entity IDs would break the generic-install rule,
 * so those blocks are omitted until the config grows an energy section.
 */
export function renderEnergySheet(ctx: LayerContext): string {
  const t = ctx.t;
  const language = languageOf(ctx);
  const price = priceSection(ctx);
  const header = (summary: string) =>
    ctx.app._sheetHeader(
      t("sheet.kickerEnergy"),
      t("sheet.titleEnergy"),
      summary,
    );

  if (!price || !Array.isArray(price.values) || !price.values.length) {
    return `${header(escapeHtml(t("empty.data")))}<div class="sheet-scroll"><div class="empty">${icon(
      "bolt",
    )}<span>${escapeHtml(t("empty.data"))}</span></div></div>`;
  }

  const nowHour = nowOf(ctx).getHours();
  const cheap = price.cheapest ?? null;
  const buy = price.buy ?? price.now;
  const sell = liveNumber(ctx, ctx.config.price?.sell, price.sell ?? null);
  const spot = liveNumber(ctx, ctx.config.price?.spot, price.spot ?? null);
  const next = liveNumber(
    ctx,
    ctx.config.price?.next,
    price.next ?? (nowHour < 23 ? price.values[nowHour + 1] : null),
  );
  const lowest = liveNumber(
    ctx,
    ctx.config.price?.lowest,
    price.lowest ?? price.min ?? null,
  );
  const highest = liveNumber(
    ctx,
    ctx.config.price?.highest,
    price.highest ?? price.max ?? null,
  );
  const previous = liveNumber(
    ctx,
    ctx.config.price?.previous,
    price.previous ?? (nowHour > 0 ? price.values[nowHour - 1] : null),
  );
  const tomorrow = liveOn(ctx, ctx.config.price?.tomorrow, price.tomorrow);
  const cheapStart = cheap ? hourLabel(cheap.start) : "–";
  const cheapEnd = cheap ? hourLabel(cheap.end) : "–";
  const summary = cheap
    ? t("energy.summary", {
        price: formatPrice(buy, language),
        start: cheapStart,
        end: cheapEnd,
      })
    : `${formatPrice(buy, language)} ${t("common.perKwh")}`;

  const buyText = formatPrice(buy, language);
  const sellText = formatPrice(sell, language);
  const spotText = formatPrice(spot, language);

  return `${header(escapeHtml(summary))}<div class="sheet-scroll">
    <div class="block">
      <div class="big-read">${buyText}<small>${escapeHtml(
        t("common.perKwh"),
      )}</small></div>
      <div class="block-note">${escapeHtml(
        t("energy.nowNote", { sell: sellText, spot: spotText }),
      )}</div>
      <div class="block" style="margin-top:18px">
        <div class="block-label">${escapeHtml(t("energy.dayPrices"))}</div>
        ${priceBars(ctx, price, language, nowHour)}
      </div>
      <div class="mini-grid" style="margin-top:12px">
        <div class="mini-stat"><div class="k">${escapeHtml(
          t("energy.cheapest", { count: 3 }),
        )}</div><div class="v">${formatPrice(
          cheap?.avg ?? null,
          language,
        )}<small>${escapeHtml(t("energy.kr"))}</small></div><div class="row-sub">${
          cheap
            ? escapeHtml(
                t("energy.hourRange", {
                  start: cheapStart,
                  end: cheapEnd,
                }),
              )
            : "–"
        }</div></div>
        <div class="mini-stat"><div class="k">${escapeHtml(
          t("energy.tomorrow"),
        )}</div><div class="v" style="font-size:18px">${escapeHtml(
          tomorrow ? t("energy.tomorrowPublished") : t("energy.tomorrowNotYet"),
        )}</div><div class="row-sub">${escapeHtml(
          tomorrow ? t("energy.tomorrowSee") : t("energy.tomorrowTypical"),
        )}</div></div>
      </div>
    </div>
    <div class="block">
      <div class="block-label">${escapeHtml(t("energy.pricesNow"))}</div>
      <div class="readings">${reading(
        t("energy.buy"),
        buyText,
        t("energy.kr"),
      )}${reading(t("energy.sell"), sellText, t("energy.kr"))}${reading(
        t("energy.spot"),
        spotText,
        t("energy.kr"),
      )}${reading(
        t("energy.nextHour"),
        formatPrice(next, language),
        t("energy.kr"),
      )}</div>
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">${escapeHtml(
        t("energy.todayPrices"),
      )}</div></div>
      <div class="list">
        ${listRow(
          t("energy.lowest"),
          t("common.today"),
          `<span class="row-val">${formatPrice(
            lowest,
            language,
          )}<small>${escapeHtml(t("energy.kr"))}</small></span>`,
          icon("drop"),
        )}
        ${listRow(
          t("energy.highest"),
          t("common.today"),
          `<span class="row-val">${formatPrice(
            highest,
            language,
          )}<small>${escapeHtml(t("energy.kr"))}</small></span>`,
          icon("flame"),
        )}
        ${listRow(
          t("energy.previousHour"),
          "",
          `<span class="row-val">${formatPrice(
            previous,
            language,
          )}<small>${escapeHtml(t("energy.kr"))}</small></span>`,
          icon("clock"),
        )}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn small" data-nav="sol">${escapeHtml(
        t("sheet.titleSolar"),
      )}</button>
      <button class="btn small" data-nav="vand">${escapeHtml(
        t("sheet.titleWater"),
      )}</button>
      <button class="btn small" data-nav="teknik">${escapeHtml(
        t("sheet.titleTech"),
      )}</button>
    </div>
  </div>`;
}
