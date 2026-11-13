import { formatNumber } from "../../format";
import { areaPath, sparkPath } from "../../render/charts";
import { icon } from "../../render/icons";
import type { ArcusConfig, HomeModel, Translator } from "../../types";
import type { LayerContext, SheetApp } from "./types";

interface ChartSeries {
  key: string;
  values: Array<number | null>;
  color: string;
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
  const gradientId = `tech-chart-${chartSequence++}`;
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
  return `<div class="chart-box ${hasData ? "" : "no-data"}">
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
 * Tech: router/Google/Cloudflare latency, packet loss, jitter and the
 * inverter/datalogger details. The 6-hour pulse is rendered from the history
 * cache rather than left for the card to fill in later.
 */
export function renderTechSheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const tech = model.tech;
  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 1) =>
    formatNumber(value, digits, language);

  if (!tech) {
    return `${header(
      ctx,
      t("sheet.kickerTech"),
      t("sheet.titleTech"),
      "–",
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "network",
    )}<span>${esc(t("empty.data"))}</span></div></div>`;
  }

  const router = tech.router ?? null;
  const google = tech.google ?? null;
  const cloudflare = tech.cloudflare ?? null;
  const loss = tech.packetLoss ?? null;
  const loss7 = tech.packetLoss7d ?? null;
  const jitter = tech.jitter ?? null;
  const online = tech.routerOnline;
  const status =
    online === true
      ? t("tech.responds")
      : online === false
        ? t("tech.notResponding")
        : "–";
  const statusLabel =
    online === true ? t("common.ok") : online === false ? t("tech.down") : "–";
  const hoursUnit = language === "da" ? "t" : "h";

  const routerSeries = historySeries(ctx, config.network?.router);
  const googleSeries = historySeries(ctx, config.network?.google);
  const cloudflareSeries = historySeries(ctx, config.network?.cloudflare);

  return `${header(
    ctx,
    t("sheet.kickerTech"),
    t("sheet.titleTech"),
    t("tech.summary", {
      router: fmt(router, 1),
      google: fmt(google, 1),
      loss: fmt(loss7, 2),
    }),
  )}<div class="sheet-scroll">
    <div class="readings">
      ${read(t("tech.router"), fmt(router, 1), "ms")}
      ${read(t("tech.google"), fmt(google, 1), "ms")}
      ${read(t("tech.cloudflare"), fmt(cloudflare, 1), "ms")}
      ${read(t("tech.packetLoss"), fmt(loss, 1), "%")}
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">${t(
        "tech.pulse",
      )}</div><div class="legend"><span><i style="--c:var(--sky)"></i>${t(
        "tech.router",
      )}</span><span><i style="--c:var(--sage)"></i>${t(
        "tech.google",
      )}</span><span><i style="--c:var(--plum)"></i>${t(
        "tech.cloudflare",
      )}</span></div></div>
      ${chartBox(
        [
          { key: "router", values: routerSeries, color: "var(--sky)" },
          { key: "google", values: googleSeries, color: "var(--sage)" },
          {
            key: "cloudflare",
            values: cloudflareSeries,
            color: "var(--plum)",
          },
        ],
        150,
        t,
        false,
      )}
    </div>
    <div class="block">
      <div class="block-label">${t("tech.quality")}</div>
      <div class="list">
        ${row(
          t("tech.router"),
          status,
          `<span class="status-line"><i class="dot ${
            online === false ? "warn" : ""
          }"></i>${statusLabel}</span>`,
          { lead: icon("network") },
        )}
        ${row(
          t("tech.jitter"),
          t("tech.router"),
          `<span class="row-val">${fmt(jitter, 2)}<small>ms</small></span>`,
          { lead: icon("wind") },
        )}
        ${row(
          t("tech.packetLoss7d"),
          "",
          `<span class="row-val">${fmt(loss7, 2)}<small>%</small></span>`,
          { lead: icon("alert") },
        )}
        ${row(
          t("tech.google"),
          "8.8.8.8",
          `<span class="row-val">${fmt(google, 1)}<small>ms</small></span>`,
          { lead: icon("network") },
        )}
        ${row(
          t("tech.cloudflare"),
          "1.1.1.1",
          `<span class="row-val">${fmt(cloudflare, 1)}<small>ms</small></span>`,
          { lead: icon("network") },
        )}
      </div>
    </div>
    <div class="block">
      <div class="block-label">${t("tech.inverter")}</div>
      <div class="list">
        ${row(
          t("tech.wifi"),
          "",
          `<span class="row-val">${fmt(tech.wifiSignal, 0)}<small>dBm</small></span>`,
          { lead: icon("network") },
        )}
        ${row(
          t("tech.uptime"),
          "",
          `<span class="row-val" style="font-size:13px">${
            tech.uptime === null || tech.uptime === undefined
              ? "–"
              : Math.round(tech.uptime / 3600)
          }<small>${hoursUnit}</small></span>`,
          { lead: icon("clock") },
        )}
        ${row(
          t("tech.pulseTemp"),
          "",
          `<span class="row-val">${fmt(tech.temperature, 1)}<small>°C</small></span>`,
          { lead: icon("thermometer") },
        )}
        ${row(
          t("tech.frequency"),
          "",
          `<span class="row-val">${fmt(tech.frequency, 2)}<small>Hz</small></span>`,
          { lead: icon("bolt") },
        )}
        ${row(
          t("tech.model"),
          "",
          `<span class="row-val" style="font-size:11px">${esc(
            tech.inverterModel || "–",
          )}</span>`,
          { lead: icon("info") },
        )}
        ${row(
          t("tech.datalogger"),
          "",
          `<span class="row-val" style="font-size:11px">${esc(
            tech.dataloggerVersion || "–",
          )}</span>`,
          { lead: icon("info") },
        )}
      </div>
    </div>
    <div class="note">${t("tech.footer")}</div>
  </div>`;
}
