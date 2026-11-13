import { countdown, formatTime } from "../../format";
import { icon } from "../../render/icons";
import type { ArcusConfig, HomeModel } from "../../types";
import type { LayerContext, SheetApp } from "./types";

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

/**
 * Prayers: today's five times, the next-prayer highlight and sunrise/sunset.
 * The next prayer may be tomorrow's Fajr after Isha; the countdown helper
 * wraps to the next day so the sheet stays correct around midnight.
 */
export function renderPrayersSheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const prayers = model.prayers;
  const language = languageOf(model, config);
  const now = new Date();

  if (!prayers) {
    return `${header(
      ctx,
      t("sheet.kickerRhythm"),
      t("sheet.titlePrayers"),
      t("prayers.dayTimes"),
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "moon",
    )}<span>${esc(t("prayers.none"))}</span></div></div>`;
  }

  const times = Array.isArray(prayers.times) ? prayers.times : [];
  const next = prayers.next ?? null;

  if (!times.length && !next) {
    return `${header(
      ctx,
      t("sheet.kickerRhythm"),
      t("sheet.titlePrayers"),
      t("prayers.dayTimes"),
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "moon",
    )}<span>${esc(t("prayers.none"))}</span></div></div>`;
  }

  const summary = next
    ? t("prayers.summary", {
        name: next.name,
        time: formatTime(next.time, language),
        countdown: countdown(next.time, now, language),
      })
    : t("prayers.dayTimes");

  const countdownText = next
    ? countdown(next.time, now, language).replace(/^(om|in)\s+/i, "")
    : "";

  const rows = times
    .map((prayer) => {
      const isNext = next !== null && next.id === prayer.id;
      return `<div class="row ${isNext ? "on" : ""}"><span class="row-main"><div class="row-name"${
        isNext ? ' style="color:var(--accent);font-weight:600"' : ""
      }>${esc(prayer.name)}</div><div class="row-sub">${
        isNext ? t("prayers.nextToday") : t("prayers.today")
      }</div></span><span class="row-val">${formatTime(
        prayer.time,
        language,
      )}</span>${
        isNext ? `<span class="chip warn">${t("prayers.badge")}</span>` : ""
      }</div>`;
    })
    .join("");

  const sunset =
    times.find((prayer) => prayer.id === "maghrib") ??
    times.find((prayer) => prayer.name === t("prayers.maghrib"));

  return `${header(
    ctx,
    t("sheet.kickerRhythm"),
    t("sheet.titlePrayers"),
    summary,
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="eyebrow">${t("prayers.next")}</div>
      <div class="big-read">${
        next ? formatTime(next.time, language) : "–"
      }<small>${next ? esc(next.name) : ""}</small></div>
      <div class="block-note">${
        next
          ? t("prayers.inCountdown", {
              name: esc(next.name),
              countdown: countdownText,
            })
          : t("prayers.none")
      }</div>
    </div>
    <div class="block">
      <div class="block-label">${t("prayers.five")}</div>
      <div class="list">${
        rows || `<div class="block-note">${esc(t("prayers.none"))}</div>`
      }</div>
    </div>
    <div class="block">
      <div class="block-label">${t("prayers.sun")}</div>
      <div class="readings">
        ${read(
          t("prayers.sunrise"),
          prayers.sunrise ? formatTime(prayers.sunrise, language) : "–",
          "",
        )}
        ${read(
          t("prayers.sunset"),
          sunset ? formatTime(sunset.time, language) : "–",
          "",
        )}
      </div>
    </div>
    <div class="note">${t("prayers.footer")}</div>
  </div>`;
}
