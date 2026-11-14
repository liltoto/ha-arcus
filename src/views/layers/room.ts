import { formatNumber, formatUnit } from "../../format";
import { areaPath, sparkPath } from "../../render/charts";
import { graphAttrs } from "../../render/graph";
import { icon } from "../../render/icons";
import type {
  EntityRef,
  HassEntity,
  LightGroupModel,
  OpeningModel,
  RoomModel,
} from "../../types";
import type { LayerContext, SheetApp } from "./types";

/**
 * The card object that backs the sheet. `SheetApp` is the documented surface;
 * the runtime helpers (`_n`, `_get`, `_on`) are the same read-only helpers the
 * home view uses, so the sheet does not keep a second copy of the hass state.
 *
 * They are optional here so a minimal integration (or a test double) can still
 * render the sheet; every read falls back to the snapshot carried by the model.
 */
export interface SheetRuntimeApp extends SheetApp {
  _n?(entityId: string, fallback?: number | null): number | null;
  _get?(entityId: string): HassEntity | undefined;
  _on?(entityId: string): boolean;
}

export type SheetLanguage = "da" | "en";

export interface RoomStat {
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  lightsOn: number;
  lightsTotal: number;
  open: number;
  leak: boolean;
}

export interface RowOptions {
  cls?: string;
  lead?: string;
  attrs?: string;
}

const FALLBACK_STATE = new Set(["", "unknown", "unavailable"]);

export function runtimeApp(ctx: LayerContext): SheetRuntimeApp {
  return ctx.app as SheetRuntimeApp;
}

export function languageOf(ctx: LayerContext): SheetLanguage {
  const { model, config, t } = ctx;
  if (model.language === "da" || model.language === "en") return model.language;
  if (config.language === "da" || config.language === "en") {
    return config.language;
  }
  return t("common.today") === "I dag" ? "da" : "en";
}

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function numberFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/** The live entity from hass, when the card exposes `_get`. */
export function getEntity(
  ctx: LayerContext,
  entityId: string | null | undefined,
): HassEntity | undefined {
  if (!entityId) return undefined;
  const app = runtimeApp(ctx);
  return typeof app._get === "function" ? app._get(entityId) : undefined;
}

/** A live entity or the snapshot stored on the model ref. */
export function refEntity(
  ctx: LayerContext,
  ref: EntityRef | null | undefined,
): HassEntity | EntityRef | undefined {
  if (!ref) return undefined;
  return getEntity(ctx, ref.entityId) ?? ref;
}

export function entityName(
  entity: HassEntity | EntityRef | null | undefined,
  fallback: string,
): string {
  return String(
    (entity as HassEntity | undefined)?.attributes?.friendly_name ??
      (entity as EntityRef | undefined)?.name ??
      fallback,
  );
}

export function isOn(
  ctx: LayerContext,
  entityId: string | null | undefined,
  fallback?: EntityRef | null,
): boolean {
  const live = getEntity(ctx, entityId);
  if (live) return live.state === "on" || live.state === "open";
  const app = runtimeApp(ctx);
  if (typeof app._on === "function") return app._on(entityId ?? "");
  return fallback?.state === "on" || fallback?.state === "open";
}

/** Prefer the live number from `_n`, then the model snapshot. */
export function numberOf(
  ctx: LayerContext,
  ref: EntityRef | null | undefined,
): number | null {
  if (!ref) return null;
  const app = runtimeApp(ctx);
  if (typeof app._n === "function") {
    const live = app._n(ref.entityId);
    if (live !== null && live !== undefined) return live;
  }
  return numberFrom(ref.state);
}

export function isAvailableState(state: string | undefined): boolean {
  return typeof state === "string" && !FALLBACK_STATE.has(state);
}

export function lightIdsFor(room: RoomModel): string[] {
  const ids = new Set<string>();
  for (const group of room.lights) {
    if (group.members.length) {
      group.members.forEach((id) => ids.add(id));
    } else {
      ids.add(group.entityId);
    }
    group.extra.forEach((id) => ids.add(id));
  }
  return [...ids];
}

export function roomStatFor(ctx: LayerContext, room: RoomModel): RoomStat {
  const stored = ((ctx.model.roomStats ?? {}) as Record<string, RoomStat>)[
    room.id
  ];
  const lightIds = lightIdsFor(room);
  const fallbackTemp = room.tempFallback
    ? numberFrom(
        refEntity(ctx, room.tempFallback)?.attributes?.current_temperature,
      )
    : null;

  return {
    temp: numberOf(ctx, room.temp) ?? fallbackTemp ?? stored?.temp ?? null,
    humidity: numberOf(ctx, room.humidity) ?? stored?.humidity ?? null,
    co2: numberOf(ctx, room.co2) ?? stored?.co2 ?? null,
    lightsOn: lightIds.filter((id) => isOn(ctx, id)).length,
    lightsTotal: lightIds.length,
    open: room.openings.filter((opening) => isOn(ctx, opening.id)).length,
    leak: room.leak ? isOn(ctx, room.leak.entityId, room.leak) : false,
  };
}

export function read(label: string, value: string | number, unit = ""): string {
  return `<div class="reading"><div class="v"><span>${esc(value)}</span><small>${esc(
    unit,
  )}</small></div><div class="l">${esc(label)}</div></div>`;
}

export function row(
  name: string,
  sub: string,
  right = "",
  opts: RowOptions = {},
): string {
  return `<div class="row ${opts.cls || ""}" ${opts.attrs || ""}>
    ${opts.lead || ""}
    <div class="row-main"><div class="row-name">${name}</div>${
      sub ? `<div class="row-sub">${sub}</div>` : ""
    }</div>
    ${right}
  </div>`;
}

export function toggle(
  entityId: string,
  act = "toggle-switch",
  on = false,
  notOff = false,
  label = "Skift",
): string {
  const stateAttr = notOff
    ? `data-not-off="${esc(entityId)}"`
    : `data-on="${esc(entityId)}"`;
  return `<button class="toggle ${on ? "on" : ""}" data-act="${esc(
    act,
  )}" data-entity="${esc(entityId)}" ${stateAttr} aria-label="${esc(
    label,
  )}"></button>`;
}

export function stepper(
  entityId: string,
  act: string,
  step: number,
  value: string,
  language: SheetLanguage = "da",
): string {
  const down = language === "da" ? "Ned" : "Down";
  const up = language === "da" ? "Op" : "Up";
  return `<div class="stepper"><button data-act="${esc(
    act,
  )}" data-entity="${esc(entityId)}" data-step="${step}" data-dir="-1" aria-label="${down}">${icon(
    "minus",
  )}</button><span class="val">${esc(
    value,
  )}</span><button data-act="${esc(act)}" data-entity="${esc(
    entityId,
  )}" data-step="${step}" data-dir="1" aria-label="${up}">${icon(
    "plus",
  )}</button></div>`;
}

/**
 * A static SVG chart from the cached history. The legacy card filled chart
 * paths during its refresh loop; a static path keeps the sheet independent of
 * the card's chart bindings and still updates when the sheet re-renders.
 */
export function chart(
  ctx: LayerContext,
  entityId: string | null | undefined,
  color: string,
  height = 120,
  options: { unit?: string; decimals?: number } = {},
): string {
  const values = entityId ? ctx.history.series(entityId) : [];
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const gradientId = `g${String(entityId ?? "chart").replace(
    /[^a-z0-9]/gi,
    "",
  )}-${height}`;
  const line = hasData ? sparkPath(values, 560, height, 2) : "";
  const area = hasData ? areaPath(values, 560, height, 2) : "";
  const grid = [0.25, 0.5, 0.75]
    .map(
      (part) =>
        `<line x1="0" y1="${height * part}" x2="560" y2="${
          height * part
        }" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`,
    )
    .join("");

  const now = Date.now();
  const graph = hasData
    ? graphAttrs({
        start: now - 86_400_000,
        end: now,
        unit: options.unit ?? "",
        decimals: options.decimals ?? 1,
        series: [{ values }],
      })
    : "";
  return `<div class="chart-box${hasData ? "" : " no-data"}" ${graph}>
    <svg viewBox="0 0 560 ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".26"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}
      <path fill="url(#${gradientId})" d="${area}"/>
      <path fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke" d="${line}"/>
    </svg>
    <span class="chart-empty">${esc(ctx.t("empty.chart"))}</span>
  </div>`;
}

export function lightRow(
  ctx: LayerContext,
  entityId: string,
  name: string,
  showSlider = true,
): string {
  const state = getEntity(ctx, entityId);
  const on = state?.state === "on";
  const brightness = numberFrom(state?.attributes?.brightness);
  const pct =
    on && brightness !== null ? Math.round((brightness / 255) * 100) : 0;
  const sub = on ? ctx.t("room.lightOn", { pct }) : ctx.t("room.lightOff");

  return `<div class="light-row">
    <div class="row">
      <button class="toggle ${on ? "on" : ""}" data-act="toggle-light" data-entity="${esc(
        entityId,
      )}" data-on="${esc(entityId)}" aria-label="${esc(
        ctx.t("lights.toggleAria", { name }),
      )}"></button>
      <div class="row-main"><div class="row-name">${esc(
        name,
      )}</div><div class="row-sub">${esc(sub)}</div></div>
      <span class="row-val">${on ? `${pct} %` : "–"}</span>
    </div>
    ${
      showSlider
        ? `<div class="slider-wrap"><div class="slider-line">${icon(
            "sun",
          )}<input class="range" type="range" min="0" max="100" step="1" data-range-entity="${esc(
            entityId,
          )}" value="${pct}" style="--p:${pct}%"></div><div class="pct">${
            on ? `${pct} %` : esc(ctx.t("lights.sliderOff"))
          }</div></div>`
        : ""
    }
  </div>`;
}

function lightName(ctx: LayerContext, entityId: string): string {
  return entityName(getEntity(ctx, entityId), entityId);
}

function lastChanged(
  ctx: LayerContext,
  entityId: string,
  fallback?: EntityRef | null,
): string {
  const raw =
    getEntity(ctx, entityId)?.last_changed ??
    (fallback as { last_changed?: string } | null | undefined)?.last_changed;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 2) return ctx.t("room.relativeNow");
  if (minutes < 60) return ctx.t("room.relativeMinutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return ctx.t("room.relativeHours", { count: hours });
  return ctx.t("room.relativeDays", { count: Math.round(hours / 24) });
}

function airSummary(
  ctx: LayerContext,
  humidity: number | null,
  co2: number | null,
  language: SheetLanguage,
): string {
  if (co2 !== null) {
    return `${ctx.t("room.air")} ${formatUnit(co2, "ppm", language, 0)}`;
  }
  if (humidity !== null) {
    return `${ctx.t("room.humidityShort")} ${formatUnit(
      humidity,
      "%",
      language,
      0,
    )}`;
  }
  return `${ctx.t("room.air")} –`;
}

function openingIcon(opening: OpeningModel): string {
  const kind = String(opening.kind ?? "").toLowerCase();
  if (/læk|laek|leak|vand|water/.test(kind)) return "drop";
  if (/vind|window/.test(kind)) return "wind";
  return "door";
}

function lightBlock(
  ctx: LayerContext,
  room: RoomModel,
  stat: RoomStat,
): string {
  if (!room.lights.length) return "";
  const { t } = ctx;

  const groups = room.lights
    .map((group: LightGroupModel) => {
      const members = group.members
        .map((id) => lightRow(ctx, id, lightName(ctx, id), false))
        .join("");
      const extras = group.extra
        .map((id) => lightRow(ctx, id, lightName(ctx, id), true))
        .join("");
      return `${lightRow(ctx, group.entityId, group.name, true)}${
        group.members.length
          ? `<details class="light-details"><summary>${esc(
              t("room.singleLights", { count: group.members.length }),
            )}</summary>${members}</details>`
          : ""
      }${extras}`;
    })
    .join("");

  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.lights"),
    )}</div><div class="block-label"><b>${esc(
      t("room.lightCountOf", {
        on: stat.lightsOn,
        total: stat.lightsTotal,
      }),
    )}</b></div></div>
    <div class="list">${groups}</div>
  </div>`;
}

function openingBlock(
  ctx: LayerContext,
  room: RoomModel,
  stat: RoomStat,
): string {
  if (!room.openings.length) return "";
  const { t } = ctx;
  const rows = room.openings
    .map((opening) => {
      const on = isOn(ctx, opening.id);
      const stateLabel = on ? t("common.openUpper") : t("common.closedUpper");
      const relative = lastChanged(ctx, opening.id);
      const right = `<span class="status-line"><i class="dot ${
        on ? "warn" : ""
      }"></i>${esc(stateLabel)}</span>`;
      return row(
        esc(opening.name),
        `${esc(opening.kind)} · ${esc(
          on ? t("common.open") : t("common.closed"),
        )} ${esc(relative)}`,
        right,
        {
          lead: icon(openingIcon(opening)),
          attrs: `data-open="${esc(opening.id)}"`,
        },
      );
    })
    .join("");

  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.openings"),
    )}</div><div class="block-label"><b>${esc(
      stat.open
        ? t("room.openCount", { count: stat.open })
        : t("common.allClosedLower"),
    )}</b></div></div>
    <div class="list">${rows}</div>
  </div>`;
}

function heatingBlock(
  ctx: LayerContext,
  room: RoomModel,
  language: SheetLanguage,
): string {
  if (!room.climate) return "";
  const { t } = ctx;
  const climate = refEntity(ctx, room.climate);
  const current = numberFrom(climate?.attributes?.current_temperature);
  const target = numberFrom(climate?.attributes?.temperature);
  const mode = climate?.state;
  const targetText =
    target === null ? "–" : `${formatNumber(target, 1, language)}°`;
  const currentText =
    current === null ? "–" : `${formatNumber(current, 1, language)}°`;

  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.heating"),
    )}</div><div class="block-label"><b>${esc(
      mode === "off" ? t("room.heatingOff") : t("room.heatingOn"),
    )}</b></div></div>
    <div class="row">
      <span class="row-main"><div class="row-name">${esc(
        room.name,
      )}</div><div class="row-sub">${esc(
        t("room.heatingNow", { temp: currentText }),
      )} · ${esc(
        climate?.attributes?.hvac_action === "heating"
          ? t("room.heatingActive")
          : t("room.heatingHolding"),
      )}</div></span>
      ${stepper(room.climate.entityId, "temp-step", 0.5, targetText, language)}
      ${toggle(
        room.climate.entityId,
        "hvac-toggle",
        mode !== "off",
        true,
        t("common.toggle"),
      )}
    </div>
    <div class="block-note">${esc(
      t("room.setpointNote", { temp: targetText }),
    )}</div>
  </div>`;
}

function fanBlock(
  ctx: LayerContext,
  room: RoomModel,
  language: SheetLanguage,
): string {
  if (!room.fan) return "";
  const { t } = ctx;
  const fan = refEntity(ctx, room.fan);
  const filterHours = numberOf(ctx, room.filter);
  const resetId = [room.filterAlarm?.entityId, room.filter?.entityId].find(
    (id) => typeof id === "string" && id.startsWith("button."),
  );
  const reset = resetId
    ? `<button class="btn small" data-act="press-button" data-entity="${esc(
        resetId,
      )}">${esc(t("room.resetFilter"))}</button>`
    : "";

  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.hood"),
    )}</div><div class="block-label"><b>${esc(
      isOn(ctx, room.fan.entityId, room.fan)
        ? t("room.heatingOn")
        : t("room.heatingOff"),
    )}</b></div></div>
    ${row(
      esc(entityName(fan, "Thermex")),
      esc(
        t("room.filterTime", {
          hours: formatNumber(filterHours, 1, language),
        }),
      ),
      `<span class="row-val">${esc(
        String(fan?.attributes?.preset_mode ?? "–"),
      )}</span>`,
      { lead: icon("fan") },
    )}
    <div class="btn-row"><button class="btn small" data-act="toggle-switch" data-entity="${esc(
      room.fan.entityId,
    )}">${esc(t("room.toggle"))}</button>${reset}</div>
  </div>`;
}

function motionBlock(ctx: LayerContext, room: RoomModel): string {
  if (!room.motion) return "";
  const { t } = ctx;
  const lux = numberOf(ctx, room.illuminance);
  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.motionLight"),
    )}</div></div>
    <div class="readings">
      ${read(
        t("room.motion"),
        isOn(ctx, room.motion.entityId, room.motion)
          ? t("room.active")
          : t("room.calm"),
      )}
      ${read(
        t("room.illuminance"),
        lux === null ? "–" : String(Math.round(lux)),
        "lx",
      )}
    </div>
  </div>`;
}

function batteryBlock(ctx: LayerContext, room: RoomModel): string {
  if (!room.battery) return "";
  const { t } = ctx;
  const level = numberOf(ctx, room.battery);
  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.battery"),
    )}</div></div>
    ${row(
      esc(entityName(room.battery, t("room.battery"))),
      esc(room.name),
      `<span class="row-val">${
        level === null ? "–" : Math.round(level)
      }<small>%</small></span>`,
      { lead: icon("battery") },
    )}
  </div>`;
}

function mediaBlock(ctx: LayerContext, room: RoomModel): string {
  if (!room.media) return "";
  const { t } = ctx;
  const media = refEntity(ctx, room.media);
  const state = media?.state;
  const stateText =
    state === "playing"
      ? t("room.playing")
      : state === "off"
        ? t("room.heatingOff")
        : (state ?? "–");

  return `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.media"),
    )}</div><div class="block-label"><b>${esc(stateText)}</b></div></div>
    ${row(
      esc(entityName(media, t("room.soundbar"))),
      esc(room.name),
      `<button class="icon-btn" data-act="media-toggle" data-entity="${esc(
        room.media.entityId,
      )}" aria-label="${esc(t("room.playing"))}">${icon(
        state === "playing" ? "pause" : "play",
      )}</button>`,
      { lead: icon("play") },
    )}
  </div>`;
}

/**
 * The room sheet. `sub` is the area ID from the route; an unknown or missing
 * room falls back to the first discovered room, matching the prototype.
 */
export function renderRoomSheet(
  ctx: LayerContext,
  sub?: string | null,
): string {
  const { model, t } = ctx;
  const room =
    model.rooms.find((candidate) => candidate.id === sub) ?? model.rooms[0];

  if (!room) {
    return `${ctx.app._sheetHeader(
      t("sheet.kickerRoom"),
      t("empty.rooms"),
      "",
    )}<div class="sheet-scroll"><div class="empty">${esc(
      t("empty.rooms"),
    )}</div></div>`;
  }

  const language = languageOf(ctx);
  const stat = roomStatFor(ctx, room);
  const directTemp = numberOf(ctx, room.temp);
  const temp =
    directTemp ??
    stat.temp ??
    numberFrom(room.tempFallback?.attributes?.current_temperature);
  const humidity = numberOf(ctx, room.humidity) ?? stat.humidity;
  const co2 = numberOf(ctx, room.co2) ?? stat.co2;
  const pm25 = numberOf(ctx, room.pm25);

  const tempChartId =
    directTemp !== null
      ? room.temp?.entityId
      : (room.tempFallback?.entityId ?? room.temp?.entityId);
  const chartIds = [
    tempChartId,
    room.humidity?.entityId,
    room.co2?.entityId,
    room.pm25?.entityId,
  ].filter((id): id is string => typeof id === "string" && id.length > 0);
  if (chartIds.length && typeof ctx.history?.ensure === "function") {
    void ctx.history.ensure(chartIds, 24);
  }

  const air = airSummary(ctx, humidity, co2, language);
  const lightsText = stat.lightsTotal
    ? t("room.lightsCount", {
        on: stat.lightsOn,
        total: stat.lightsTotal,
      })
    : "";
  const openText = room.openings.length
    ? stat.open
      ? t("room.openCount", { count: stat.open })
      : t("room.closed")
    : "";
  const summary = `${formatNumber(temp, 1, language)}° · ${air}${
    lightsText ? ` · ${lightsText}` : ""
  }${openText ? ` · ${openText}` : ""}`;

  const fallbackNote =
    room.tempFallback && directTemp === null && stat.temp !== null
      ? `<div class="block-note">${esc(t("room.tempFallbackNote"))}</div>`
      : "";

  const tempChart = `<div class="block">
    <div class="block-head"><div class="block-label">${esc(
      t("room.chart24", { label: t("room.temperature") }),
    )}</div><div class="block-label"><b>${formatNumber(
      temp,
      1,
      language,
    )}°</b></div></div>
    ${chart(ctx, tempChartId, "var(--sky)", 120, {
      unit: "°C",
      decimals: 1,
    })}
  </div>`;

  const humidityChart = room.humidity
    ? `<div class="block"><div class="block-head"><div class="block-label">${esc(
        t("room.chart24", { label: t("room.humidity") }),
      )}</div><div class="block-label"><b>${
        humidity === null ? "–" : `${Math.round(humidity)} %`
      }</b></div></div>${chart(
        ctx,
        room.humidity.entityId,
        "var(--sky)",
        100,
        { unit: "%", decimals: 0 },
      )}</div>`
    : "";

  const co2Chart = room.co2
    ? `<div class="block"><div class="block-head"><div class="block-label">${esc(
        t("room.chart24", { label: t("room.co2") }),
      )}</div><div class="block-label"><b>${
        co2 === null ? "–" : `${Math.round(co2)} ppm`
      }</b></div></div>${chart(ctx, room.co2.entityId, "var(--sage)", 100, {
        unit: "ppm",
        decimals: 0,
      })}</div>`
    : "";

  const pm25Chart = room.pm25
    ? `<div class="block"><div class="block-head"><div class="block-label">${esc(
        t("room.chart24", { label: t("room.pm25") }),
      )}</div><div class="block-label"><b>${
        pm25 === null ? "–" : formatNumber(pm25, 1, language)
      }</b></div></div>${chart(
        ctx,
        room.pm25.entityId,
        "var(--brass)",
        90,
        { unit: "µg/m³", decimals: 1 },
      )}</div>`
    : "";

  const readings = `<div class="readings">
    ${read(t("room.temperature"), formatNumber(temp, 1, language), "°C")}
    ${read(
      t("room.humidity"),
      humidity === null ? "–" : String(Math.round(humidity)),
      "%",
    )}
    ${read(t("room.co2"), co2 === null ? "–" : String(Math.round(co2)), "ppm")}
    ${read(
      t("room.pm25"),
      pm25 === null ? "–" : formatNumber(pm25, 1, language),
      "µg/m³",
    )}
  </div>`;

  return `${ctx.app._sheetHeader(
    t("sheet.kickerRoom"),
    room.name,
    summary,
  )}<div class="sheet-scroll">
    ${readings}
    ${fallbackNote}
    ${tempChart}
    ${humidityChart}
    ${co2Chart}
    ${pm25Chart}
    ${lightBlock(ctx, room, stat)}
    ${openingBlock(ctx, room, stat)}
    ${heatingBlock(ctx, room, language)}
    ${fanBlock(ctx, room, language)}
    ${motionBlock(ctx, room)}
    ${batteryBlock(ctx, room)}
    ${mediaBlock(ctx, room)}
    <div class="note">${esc(t("room.liveNote"))}</div>
  </div>`;
}
