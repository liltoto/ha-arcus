import { formatNumber } from "../../format";
import { icon } from "../../render/icons";
import type { ArcusConfig, HomeModel } from "../../types";
import type { LayerContext, SheetApp } from "./types";

interface RoomStatsView {
  temp?: number | null;
  open?: number;
  leak?: boolean;
}

interface ChapterLink {
  route: string;
  icon: string;
  title: string;
}

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

function tile(
  route: string,
  iconName: string,
  title: string,
  sub: string,
): string {
  return `<button class="mini-stat" data-nav="${esc(
    route,
  )}" style="text-align:left;min-height:82px"><div class="k">${icon(
    iconName,
  )}</div><div class="v" style="font-size:17px;margin-top:8px">${esc(
    title,
  )}</div><div class="row-sub">${esc(sub)}</div></button>`;
}

/**
 * All layers: a room grid followed by the fixed chapter links. The chapter
 * list is static on purpose; the routes are the card's public navigation
 * surface, while the rooms come from the live model.
 */
export function renderAllSheet(ctx: LayerContext): string {
  const { model, config, t } = ctx;
  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 1) =>
    formatNumber(value, digits, language);
  const stats = (model.roomStats ?? {}) as Record<string, RoomStatsView>;

  const roomTiles = model.rooms
    .map((room) => {
      const stat = stats[room.id];
      const parts: string[] = [];
      if (typeof stat?.temp === "number") {
        parts.push(`${fmt(stat.temp, 1)}°`);
      }
      if (stat?.leak) {
        parts.push(t("room.leak"));
      } else if (stat?.open) {
        parts.push(t("room.openCount", { count: stat.open }));
      } else if (room.openings.length) {
        parts.push(t("room.closed"));
      }
      return tile(
        `rum/${room.id}`,
        room.icon,
        room.name,
        parts.join(" · ") || t("room.openShort"),
      );
    })
    .join("");

  const chapters: ChapterLink[] = [
    { route: "hjem", icon: "sun", title: t("sheet.titleHome") },
    { route: "bon", icon: "moon", title: t("sheet.titlePrayers") },
    { route: "lys", icon: "light", title: t("sheet.titleLights") },
    { route: "varme", icon: "heat", title: t("sheet.titleHeating") },
    {
      route: "ventilation",
      icon: "fan",
      title: t("sheet.titleVentilation"),
    },
    { route: "energi", icon: "bolt", title: t("sheet.titleEnergy") },
    { route: "sol", icon: "solar", title: t("sheet.titleSolar") },
    { route: "vand", icon: "drop", title: t("sheet.titleWater") },
    {
      route: "sikkerhed",
      icon: "shield",
      title: t("sheet.titleSecurity"),
    },
    { route: "teknik", icon: "network", title: t("sheet.titleTech") },
    { route: "oekonomi", icon: "chart", title: t("sheet.titleEconomy") },
    { route: "alarmer", icon: "bell", title: t("sheet.titleAlerts") },
  ];
  const homeChapters = chapters.slice(0, 8);
  const operationsChapters = chapters.slice(8);

  const chapterGrid = (items: ChapterLink[]) =>
    `<div class="mini-grid">${items
      .map((chapter) =>
        tile(chapter.route, chapter.icon, chapter.title, t("sheet.details")),
      )
      .join("")}</div>`;

  return `${header(
    ctx,
    t("sheet.kickerOverview"),
    t("sheet.titleAll"),
    t("sheet.allSummary"),
  )}<div class="sheet-scroll">
    <div class="block">
      <div class="block-label">${t("section.roomsTitle")}</div>
      ${
        roomTiles
          ? `<div class="mini-grid">${roomTiles}</div>`
          : `<div class="empty">${icon("home")}<span>${esc(
              t("empty.rooms"),
            )}</span></div>`
      }
    </div>
    <div class="block">
      <div class="block-label">${t("sheet.navHome")}</div>
      ${chapterGrid(homeChapters)}
    </div>
    <div class="block">
      <div class="block-label">${t("sheet.navOperations")}</div>
      ${chapterGrid(operationsChapters)}
    </div>
  </div>`;
}
