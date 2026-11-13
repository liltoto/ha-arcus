import { formatNumber } from "../../format";
import { icon } from "../../render/icons";
import type {
  ArcusConfig,
  HomeModel,
  OpeningModel,
  SecurityBatteryModel,
} from "../../types";
import type { LayerContext, SheetApp } from "./types";

interface RichSheetApp extends SheetApp {
  _get?: (
    entityId: string,
  ) => { state?: string; attributes?: Record<string, any> } | null | undefined;
  _on?: (entityId: string) => boolean;
  _state?: (entityId: string) => string | null | undefined;
}

interface SecurityOpening extends OpeningModel {
  isLeak: boolean;
}

const HOUSE_CELLS = [
  { x: 10, y: 10, w: 125, h: 95, cx: 72, labelY: 34, dotY: 78 },
  { x: 145, y: 10, w: 125, h: 95, cx: 207, labelY: 34, dotY: 78 },
  { x: 280, y: 10, w: 125, h: 95, cx: 342, labelY: 34, dotY: 78 },
  { x: 415, y: 10, w: 135, h: 95, cx: 482, labelY: 34, dotY: 78 },
  { x: 10, y: 115, w: 125, h: 95, cx: 72, labelY: 139, dotY: 183 },
  { x: 145, y: 115, w: 125, h: 95, cx: 207, labelY: 139, dotY: 183 },
  { x: 280, y: 115, w: 125, h: 95, cx: 342, labelY: 139, dotY: 183 },
  { x: 415, y: 115, w: 135, h: 95, cx: 482, labelY: 139, dotY: 183 },
] as const;

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

function openingIcon(opening: SecurityOpening): string {
  if (opening.isLeak) return icon("drop");
  if (/vindue|window/i.test(opening.kind)) return icon("wind");
  return icon("door");
}

function roomForOpening(
  ctx: LayerContext,
  opening: SecurityOpening,
): { id: string; name: string } | null {
  if (!opening.room) return null;
  return (
    ctx.model.rooms.find(
      (room) => room.name === opening.room || room.id === opening.room,
    ) ?? null
  );
}

/**
 * Security: the house schematic, every door/window/leak, battery levels and
 * the window-alert automation.
 *
 * The resolved security model carries the summary counts. Per-opening live
 * states come from the card's optional `_on` helper; a plain model still
 * renders a readable fallback based on the counts.
 */
export function renderSecuritySheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const security = model.security;
  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 0) =>
    formatNumber(value, digits, language);

  if (!security) {
    return `${header(
      ctx,
      t("sheet.kickerSecurity"),
      t("sheet.titleSecurity"),
      "–",
    )}<div class="sheet-scroll"><div class="empty">${icon(
      "shield",
    )}<span>${esc(t("empty.data"))}</span></div></div>`;
  }

  const leakIds = config.security?.leaks ?? [];
  const leakSet = new Set(leakIds);
  const openings: SecurityOpening[] = (security.openings ?? []).map(
    (opening) => ({
      ...opening,
      isLeak:
        leakSet.has(opening.id) ||
        /lækage|leak|vand/i.test(`${opening.kind} ${opening.name}`),
    }),
  );
  for (const [index, entityId] of leakIds.entries()) {
    if (openings.some((opening) => opening.id === entityId)) continue;
    openings.push({
      id: entityId,
      name: entityName(ctx, entityId, index),
      kind: t("water.leak"),
      room: "",
      isLeak: true,
    });
  }

  // Resolve the per-opening state. When the card cannot supply one, the
  // security summary is used as a deterministic fallback so the sheet never
  // claims everything is closed when the model says something is open.
  const openStates = new Map<string, boolean | null>();
  let remainingOpen = security.open ?? 0;
  for (const opening of openings) {
    let state = isOn(ctx, opening.id);
    if (state === null) {
      if (opening.isLeak) {
        state = Boolean(security.leak);
      } else if (remainingOpen > 0) {
        state = true;
        remainingOpen -= 1;
      } else {
        state = false;
      }
    }
    openStates.set(opening.id, state);
  }

  const openCount =
    security.open ??
    openings.filter(
      (opening) => !opening.isLeak && openStates.get(opening.id) === true,
    ).length;
  const leak =
    Boolean(security.leak) ||
    openings.some(
      (opening) => opening.isLeak && openStates.get(opening.id) === true,
    );

  const houseRooms = model.rooms.slice(0, HOUSE_CELLS.length);
  const cellForOpening = (opening: SecurityOpening, index: number): number => {
    const room = roomForOpening(ctx, opening);
    const roomIndex = room
      ? houseRooms.findIndex((candidate) => candidate.id === room.id)
      : -1;
    return roomIndex >= 0 ? roomIndex : index % HOUSE_CELLS.length;
  };

  const dots = openings
    .map((opening, index) => {
      const cellIndex = cellForOpening(opening, index);
      const cell = HOUSE_CELLS[cellIndex];
      const slot = openings
        .slice(0, index)
        .filter((candidate, candidateIndex) => {
          return cellForOpening(candidate, candidateIndex) === cellIndex;
        }).length;
      const x = cell.cx + ((slot % 3) - 1) * 13;
      const y = cell.dotY + Math.floor(slot / 3) * 10;
      return `<circle cx="${x}" cy="${y}" r="4" class="house-dot ${
        openStates.get(opening.id) ? "open" : ""
      }" data-open="${esc(opening.id)}"/>`;
    })
    .join("");

  const openingRows = openings
    .map((opening) => {
      const open = openStates.get(opening.id) === true;
      const room = roomForOpening(ctx, opening);
      const roomName = opening.room || room?.name || "";
      const status = opening.isLeak
        ? open
          ? t("security.alarm")
          : t("security.dry")
        : open
          ? t("security.openUpper")
          : t("security.closedUpper");
      return row(
        esc(opening.name),
        `${esc(opening.kind)}${roomName ? ` · ${esc(roomName)}` : ""}`,
        `<span class="status-line"><i class="dot ${
          open ? "warn" : ""
        }"></i>${status}</span>`,
        {
          lead: openingIcon(opening),
          nav: opening.isLeak ? "vand" : room ? `rum/${room.id}` : "sikkerhed",
        },
      );
    })
    .join("");

  const batteries: SecurityBatteryModel[] = [
    ...(security.batteries ?? []),
  ].sort((a, b) => (a.level ?? 101) - (b.level ?? 101));
  const batteryRows = batteries
    .map((battery) => {
      const level =
        battery.level === null
          ? null
          : Math.max(0, Math.min(100, battery.level));
      return `<div class="row"><span class="row-main"><div class="row-name">${esc(
        battery.name,
      )}</div><div class="row-sub">${
        level !== null && level < 20
          ? t("security.changeSoon")
          : t("security.ok")
      }</div></span><div class="bar" data-batt="${esc(
        battery.entityId,
      )}"><i class="${
        level !== null && level < 20
          ? "warn"
          : level !== null && level < 40
            ? "mid"
            : ""
      }" style="width:${level ?? 0}%"></i></div><span class="row-val" style="min-width:42px;text-align:right">${
        level === null ? "–" : Math.round(level)
      }<small>%</small></span></div>`;
    })
    .join("");

  const alertId = config.security?.windowAlert;
  const alertOn = alertId
    ? (isOn(ctx, alertId) ?? Boolean(security.windowAlert))
    : Boolean(security.windowAlert);
  const openWindows = security.windows ?? security.open ?? 0;

  return `${header(
    ctx,
    t("sheet.kickerSecurity"),
    t("sheet.titleSecurity"),
    `${openCount ? t("security.summaryOpen", { count: openCount }) : t("security.summaryClosed")} · ${
      leak ? t("security.leakDetected") : t("security.noLeak")
    }`,
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="block-label">${t("security.houseNow")}</div>
      <div class="house-wrap">
        <svg viewBox="0 0 560 220" class="house-svg" aria-hidden="true">
          ${HOUSE_CELLS.map((cell, index) => {
            const room = houseRooms[index];
            const label = room
              ? (room.name.length > 12
                  ? `${room.name.slice(0, 11)}…`
                  : room.name
                ).toLocaleUpperCase()
              : "";
            return `<rect x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" rx="8" class="house-room"/>${
              room
                ? `<text x="${cell.cx}" y="${cell.labelY}" text-anchor="middle" class="house-name">${esc(
                    label,
                  )}</text>`
                : ""
            }`;
          }).join("")}
          ${dots}
        </svg>
        <div class="legend"><span><i style="--c:var(--sage)"></i>${t(
          "security.closed",
        )}</span><span><i style="--c:var(--coral)"></i>${t(
          "security.open",
        )}</span></div>
      </div>
    </div>
    <div class="block">
      <div class="block-head"><div class="block-label">${t(
        "security.doorsWindows",
      )}</div><div class="block-label"><b>${
        openCount
          ? t("security.summaryOpen", { count: openCount })
          : t("security.summaryClosed")
      }</b></div></div>
      <div class="list">${
        openingRows || `<div class="block-note">${esc(t("empty.data"))}</div>`
      }</div>
    </div>
    ${
      batteries.length
        ? `<div class="block"><div class="block-head"><div class="block-label">${t(
            "security.batteries",
          )}</div><div class="block-label"><b>${t(
            "security.lowestFirst",
          )}</b></div></div><div class="battery-list">${batteryRows}</div></div>`
        : ""
    }
    <div class="block">
      <div class="block-label">${t("security.automation")}</div>
      <div class="row"><span class="row-main"><div class="row-name">${t(
        "security.windowAlert",
      )}</div><div class="row-sub">${t(
        "security.windowAlertSub",
      )}</div></span>${
        alertId
          ? `<button class="toggle ${alertOn ? "on" : ""}" data-act="toggle-bool" data-entity="${esc(
              alertId,
            )}" data-on="${esc(alertId)}" aria-label="${esc(
              t("common.toggle"),
            )}"></button>`
          : `<span class="row-val">${alertOn ? t("common.on") : t("common.off")}</span>`
      }</div>
      <div class="row"><span class="row-main"><div class="row-name">${t(
        "security.openWindows",
      )}</div><div class="row-sub">${t(
        "security.liveCount",
      )}</div></span><span class="row-val">${fmt(openWindows, 0)}</span></div>
    </div>
  </div>`;
}
