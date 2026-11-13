import { formatNumber } from "../../format";
import { icon } from "../../render/icons";
import type { LayerContext } from "./types";
import {
  esc,
  getEntity,
  languageOf,
  numberFrom,
  numberOf,
  read,
  row,
  stepper,
  type SheetLanguage,
} from "./room";

const FILTER_OK = new Set([
  "ok",
  "nej",
  "neutral",
  "off",
  "unknown",
  "unavailable",
]);

function filterOk(filter: string | null | undefined): boolean {
  return !filter || FILTER_OK.has(filter.toLowerCase());
}

function filterLabel(
  ctx: LayerContext,
  filter: string | null | undefined,
): string {
  if (!filter) return "–";
  return filterOk(filter) ? ctx.t("ventilation.filterOk") : filter;
}

function temperature(
  value: number | null | undefined,
  language: SheetLanguage,
): string {
  return value === null || value === undefined
    ? "–"
    : `${formatNumber(value, 1, language)}°`;
}

function count(value: number | null | undefined, fallback = "–"): string {
  return value === null || value === undefined
    ? fallback
    : String(Math.round(value));
}

function optionsFor(ctx: LayerContext, entityId: string | undefined): string[] {
  if (!entityId) return [];
  const options = getEntity(ctx, entityId)?.attributes?.options;
  return Array.isArray(options) ? options.map(String) : [];
}

function select(
  ctx: LayerContext,
  entityId: string | undefined,
  value: string | null | undefined,
): string {
  if (!entityId) return `<span class="row-val">${esc(value || "–")}</span>`;
  const options = optionsFor(ctx, entityId);
  const selected = value ?? getEntity(ctx, entityId)?.state ?? "";
  if (!options.length) {
    return `<span class="row-val">${esc(selected || "–")}</span>`;
  }
  if (selected && !options.includes(selected)) options.push(selected);
  return `<select class="select" data-select-entity="${esc(entityId)}">${options
    .map(
      (option) =>
        `<option ${option === selected ? "selected" : ""}>${esc(
          option,
        )}</option>`,
    )
    .join("")}</select>`;
}

/** Nilan ventilation: readings, the five-node airflow, and the live controls. */
export function renderVentSheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const language = languageOf(ctx);
  const ventilation = model.ventilation;

  if (!ventilation) {
    return `${ctx.app._sheetHeader(
      t("sheet.kickerSystem"),
      t("sheet.titleVentilation"),
      t("empty.dataYet"),
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "fan",
    )}<span>${esc(t("empty.dataYet"))}</span></div></div>`;
  }

  // The ventilation card carries the same refs as the section; use it as a
  // fallback when a value is missing from the flattened model.
  const card = model.systemCards.find((entry) => entry.id === "ventilation");
  const temperatureValue = ventilation.temperature ?? numberOf(ctx, card?.temp);
  const humidityValue = ventilation.humidity ?? numberOf(ctx, card?.humidity);
  const stepValue = ventilation.step ?? numberOf(ctx, card?.step);
  const filterValue = ventilation.filter ?? card?.filter?.state ?? null;
  const status = filterLabel(ctx, filterValue);
  const climateId = config.ventilation?.climate ?? card?.climate?.entityId;
  const climate = climateId ? getEntity(ctx, climateId) : undefined;
  const mode = ventilation.climateMode ?? climate?.state ?? null;
  const fan = ventilation.fanMode ?? climate?.attributes?.fan_mode ?? null;
  const target =
    ventilation.target ?? numberFrom(climate?.attributes?.temperature);
  const resetId = config.ventilation?.resetButton;

  const readings = `<div class="readings">
    ${read(
      t("ventilation.roomTemp"),
      formatNumber(temperatureValue, 1, language),
      "°C",
    )}
    ${read(t("ventilation.humidity"), count(humidityValue), "%")}
    ${read(t("ventilation.fanStep"), count(stepValue), "/ 4")}
    ${read(t("ventilation.efficiency"), count(ventilation.efficiency), "%")}
  </div>`;

  const airflow = `<div class="block">
    <div class="block-label">${esc(t("ventilation.airPath"))}</div>
    <div class="flow-wrap air-flow">
      <svg viewBox="0 0 560 118" aria-hidden="true">
        <defs><marker id="airar" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="var(--line-strong)"/></marker></defs>
        <path d="M80 52 H138" stroke="var(--sky)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
        <path d="M194 52 H252" stroke="var(--sky)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
        <path d="M308 52 H366" stroke="var(--coral)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
        <path d="M422 52 H480" stroke="var(--coral)" stroke-width="1.2" marker-end="url(#airar)" stroke-dasharray="4 5"/>
        <circle cx="56" cy="52" r="24" fill="none" stroke="var(--sky)" stroke-width="1"/>
        <circle cx="166" cy="52" r="24" fill="none" stroke="var(--sky)" stroke-width="1"/>
        <circle cx="280" cy="52" r="26" fill="none" stroke="var(--accent)" stroke-width="1"/>
        <circle cx="394" cy="52" r="24" fill="none" stroke="var(--coral)" stroke-width="1"/>
        <circle cx="504" cy="52" r="24" fill="none" stroke="var(--coral)" stroke-width="1"/>
        <text x="56" y="18" class="flow-label" text-anchor="middle">${esc(
          t("ventilation.outside"),
        )}</text>
        <text x="56" y="57" class="flow-val" text-anchor="middle">${temperature(
          ventilation.outdoor,
          language,
        )}</text>
        <text x="166" y="18" class="flow-label" text-anchor="middle">${esc(
          t("ventilation.inlet"),
        )}</text>
        <text x="166" y="57" class="flow-val" text-anchor="middle">${temperature(
          ventilation.inlet,
          language,
        )}</text>
        <text x="280" y="18" class="flow-label" text-anchor="middle">${esc(
          t("ventilation.room"),
        )}</text>
        <text x="280" y="58" class="flow-val" text-anchor="middle">${temperature(
          temperatureValue,
          language,
        )}</text>
        <text x="394" y="18" class="flow-label" text-anchor="middle">${esc(
          t("ventilation.exhaust"),
        )}</text>
        <text x="394" y="57" class="flow-val" text-anchor="middle">${temperature(
          ventilation.exhaust,
          language,
        )}</text>
        <text x="504" y="18" class="flow-label" text-anchor="middle">${esc(
          t("ventilation.outlet"),
        )}</text>
        <text x="504" y="57" class="flow-val" text-anchor="middle">${temperature(
          ventilation.outlet,
          language,
        )}</text>
        <text x="280" y="102" class="flow-label" text-anchor="middle">${esc(
          t("ventilation.nilanPath"),
        )}</text>
      </svg>
    </div>
  </div>`;

  const modeLabel =
    mode === "heat"
      ? t("ventilation.heating")
      : mode === "cool"
        ? t("ventilation.cooling")
        : t("ventilation.autoLower");
  const control = climateId
    ? `<div class="block">
        <div class="block-head"><div class="block-label">${esc(
          t("ventilation.control"),
        )}</div><div class="block-label"><b>${esc(modeLabel)}</b></div></div>
        <div class="row"><span class="row-main"><div class="row-name">${esc(
          t("ventilation.setpoint"),
        )}</div><div class="row-sub">${esc(
          t("ventilation.autoSub"),
        )}</div></span>${stepper(
          climateId,
          "temp-step",
          1,
          temperature(target, language),
          language,
        )}</div>
        <div class="row"><span class="row-main"><div class="row-name">${esc(
          t("ventilation.mode"),
        )}</div></span><div class="seg">
          ${(
            [
              ["heat_cool", t("ventilation.auto")],
              ["cool", t("ventilation.cool")],
              ["heat", t("ventilation.heat")],
            ] as const
          )
            .map(
              ([value, label]) =>
                `<button class="${
                  mode === value ? "active" : ""
                }" data-act="hvac" data-entity="${esc(
                  climateId,
                )}" data-mode="${value}">${esc(label)}</button>`,
            )
            .join("")}
        </div></div>
        <div class="row"><span class="row-main"><div class="row-name">${esc(
          t("ventilation.fanStep"),
        )}</div><div class="row-sub">${esc(
          t("ventilation.manualSpeed"),
        )}</div></span><div class="seg">
          ${[0, 1, 2, 3, 4]
            .map(
              (step) =>
                `<button class="${
                  String(fan) === String(step) ? "active" : ""
                }" data-act="fan" data-entity="${esc(
                  climateId,
                )}" data-mode="${step}">${step}</button>`,
            )
            .join("")}
        </div></div>
      </div>`
    : "";

  const filterBlock = `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("ventilation.filter"),
    )}</div><div class="block-label"><b>${esc(status)}</b></div></div>
    <div class="readings">
      ${read(
        t("ventilation.daysSinceChange"),
        count(ventilation.daysSinceFilter, "0"),
      )}
      ${read(t("ventilation.daysToNext"), count(ventilation.daysToFilter, "0"))}
      ${read(
        t("ventilation.inletSpeed"),
        count(ventilation.inletFan, "0"),
        "%",
      )}
      ${read(
        t("ventilation.exhaustSpeed"),
        count(ventilation.exhaustFan, "0"),
        "%",
      )}
    </div>
    <div class="btn-row">${
      resetId
        ? `<button class="btn small" data-act="press-button" data-entity="${esc(
            resetId,
          )}">${esc(t("ventilation.resetAlarm"))}</button>`
        : ""
    }<span class="status-line" style="margin-left:auto"><i class="dot ${
      filterOk(filterValue) ? "" : "warn"
    }"></i>${esc(
      filterOk(filterValue) ? t("ventilation.filterOk") : status,
    )}</span></div>
  </div>`;

  const userBlock = `<div class="block">
    <div class="block-label">${esc(t("ventilation.userChoice"))}</div>
    <div class="row"><span class="row-main"><div class="row-name">${esc(
      t("ventilation.function1"),
    )}</div></span>${select(
      ctx,
      config.ventilation?.userFunction,
      ventilation.userFunction,
    )}</div>
    <div class="row"><span class="row-main"><div class="row-name">${esc(
      t("ventilation.time"),
    )}</div></span><span class="row-val">${count(
      ventilation.userTime,
      "0",
    )}<small>${esc(t("ventilation.min"))}</small></span></div>
    <div class="row"><span class="row-main"><div class="row-name">${esc(
      t("ventilation.speed"),
    )}</div></span><span class="row-val">${count(
      ventilation.userSpeed,
      "0",
    )}<small>/4</small></span></div>
    <div class="row"><span class="row-main"><div class="row-name">${esc(
      t("ventilation.function2"),
    )}</div></span>${select(
      ctx,
      config.ventilation?.userFunction2,
      ventilation.userFunction2,
    )}</div>
  </div>`;

  const systemBlock = `<div class="block">
    <div class="block-label">${esc(t("ventilation.system"))}</div>
    ${row(
      esc(t("ventilation.type")),
      "",
      `<span class="row-val" style="font-size:12px">${esc(
        ventilation.aggregateType || "–",
      )}</span>`,
      { lead: icon("info") },
    )}
    ${row(
      esc(t("ventilation.operation")),
      "",
      `<span class="row-val" style="font-size:12px">${esc(
        ventilation.operationMode || "–",
      )}</span>`,
      { lead: icon("fan") },
    )}
    ${row(
      esc(t("ventilation.software")),
      "",
      `<span class="row-val" style="font-size:12px">${esc(
        ventilation.software || "–",
      )}</span>`,
      { lead: icon("info") },
    )}
  </div>`;

  return `${ctx.app._sheetHeader(
    t("sheet.kickerSystem"),
    t("sheet.titleVentilation"),
    t("ventilation.summary", {
      temp: formatNumber(temperatureValue, 1, language),
      step: stepValue ?? "–",
      filter: esc(status),
    }),
  )}<div class="sheet-scroll">
    ${readings}
    ${airflow}
    ${control}
    ${filterBlock}
    ${userBlock}
    ${systemBlock}
  </div>`;
}
