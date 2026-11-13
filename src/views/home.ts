import type { HistoryCache } from "../data/history";
import { formatNumber, formatPrice, formatUnit } from "../format";
import { arcPoint, priceColor, sparkPath } from "../render/charts";
import { icon } from "../render/icons";
import type {
  ArcusConfig,
  ArcusHass,
  ChapterKey,
  HomeModel,
  LightGroupModel,
  RoomModel,
  SystemCardModel,
  Translator,
} from "../types";
import { ARCUS_VERSION } from "../version";

/** Escape a value for text and double-quoted attribute contexts. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ChapterDefinition {
  key: ChapterKey;
  titleKey: string;
  icon: string;
  route: string;
  large?: boolean;
}

const CHAPTERS: ChapterDefinition[] = [
  {
    key: "energi",
    titleKey: "sheet.titleEnergy",
    icon: "bolt",
    route: "energi",
    large: true,
  },
  {
    key: "sol",
    titleKey: "sheet.titleSolar",
    icon: "solar",
    route: "sol",
    large: true,
  },
  { key: "vand", titleKey: "sheet.titleWater", icon: "drop", route: "vand" },
  {
    key: "sikkerhed",
    titleKey: "sheet.titleSecurity",
    icon: "shield",
    route: "sikkerhed",
  },
  {
    key: "ventilation",
    titleKey: "sheet.titleVentilation",
    icon: "fan",
    route: "ventilation",
  },
  {
    key: "teknik",
    titleKey: "sheet.titleTech",
    icon: "network",
    route: "teknik",
  },
  {
    key: "oekonomi",
    titleKey: "sheet.titleEconomy",
    icon: "chart",
    route: "oekonomi",
  },
  { key: "lys", titleKey: "sheet.titleLights", icon: "light", route: "lys" },
  {
    key: "varme",
    titleKey: "sheet.titleHeating",
    icon: "heat",
    route: "varme",
  },
  {
    key: "alarmer",
    titleKey: "sheet.titleAlerts",
    icon: "bell",
    route: "alarmer",
  },
];

interface RoomStatsLike {
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  lightsOn: number;
  lightsTotal: number;
  open: number;
  leak: boolean;
}

function languageOf(config: ArcusConfig, t: Translator): string {
  if (config.language === "da" || config.language === "en") {
    return config.language;
  }
  return t("common.today") === "I dag" ? "da" : "en";
}

function refNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value === "unavailable" || value === "unknown") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function statsFor(model: HomeModel, room: RoomModel): RoomStatsLike {
  const all = (model.roomStats ?? {}) as Record<string, RoomStatsLike>;
  const stored = all[room.id];
  if (stored) return stored;

  const lightIds = roomLightIds(room);
  return {
    temp:
      refNumber(room.temp?.state) ??
      refNumber(room.tempFallback?.attributes?.current_temperature),
    humidity: refNumber(room.humidity?.state),
    co2: refNumber(room.co2?.state),
    lightsOn: 0,
    lightsTotal: lightIds.length,
    open: 0,
    leak: room.leak?.state === "on" || room.leak?.state === "open",
  };
}

function roomLightIds(room: RoomModel): string[] {
  const out: string[] = [];
  const add = (id: string) => {
    if (id && !out.includes(id)) out.push(id);
  };
  for (const group of room.lights) {
    if (group.members.length) {
      for (const member of group.members) add(member);
    } else {
      add(group.entityId);
    }
    for (const extra of group.extra) add(extra);
  }
  return out;
}

function allLightIds(groups: LightGroupModel[]): string[] {
  const out: string[] = [];
  const add = (id: string) => {
    if (id && !out.includes(id)) out.push(id);
  };
  for (const group of groups) {
    if (group.members.length) {
      for (const member of group.members) add(member);
    } else {
      add(group.entityId);
    }
    for (const extra of group.extra) add(extra);
  }
  return out;
}

function airLevel(stats: RoomStatsLike): "ok" | "mid" | "warn" | "off" {
  if (stats.co2 !== null) {
    return stats.co2 > 1000 ? "warn" : stats.co2 > 850 ? "mid" : "ok";
  }
  if (stats.humidity !== null) {
    return stats.humidity > 65 ? "warn" : "ok";
  }
  return "off";
}

function airText(
  room: RoomModel,
  stats: RoomStatsLike,
  language: string,
  t: Translator,
): string {
  if (stats.co2 !== null) {
    return `${t("room.air")} ${formatUnit(
      stats.co2,
      room.co2?.unit ?? "ppm",
      language,
      0,
    )}`;
  }
  if (stats.humidity !== null) {
    return `${t("room.humidityShort")} ${formatUnit(
      stats.humidity,
      "%",
      language,
      0,
    )}`;
  }
  return `${t("room.air")} –`;
}

function actionEntity(entity: unknown): string | undefined {
  if (typeof entity === "string" && entity.trim()) return entity.trim();
  if (Array.isArray(entity)) {
    const first = entity.find(
      (item): item is string => typeof item === "string" && !!item.trim(),
    );
    if (first) return first.trim();
  }
  return undefined;
}

function quickEntity(action: Record<string, any>): string | undefined {
  return (
    actionEntity(action?.target?.entity_id) ??
    actionEntity(action?.entity_id) ??
    actionEntity(action?.data?.entity_id)
  );
}

function renderQuickActions(
  config: ArcusConfig,
  t: Translator,
  hass?: ArcusHass,
): string {
  if (config.quick_actions.length) {
    return config.quick_actions
      .map((quick, index) => {
        const entity = quick.entity ?? quickEntity(quick.action);
        const on =
          quick.action?.action === "toggle" && entity
            ? ` data-on="${escapeHtml(entity)}"`
            : "";
        return `<button class="quick" data-act="quick" data-quick="${index}"${on}>${icon(
          quick.icon || "spark",
        )} ${escapeHtml(quick.label)}</button>`;
      })
      .join("");
  }

  const exists = (id: string) => !hass || Boolean(hass.states?.[id]);
  const buttons: string[] = [];

  if (exists("input_button.bedtime")) {
    buttons.push(
      `<button class="quick" data-act="press" data-entity="input_button.bedtime">${icon(
        "moon",
      )} ${escapeHtml(t("quick.bedtime"))}</button>`,
    );
  }
  if (exists("input_boolean.vacation_mode")) {
    buttons.push(
      `<button class="quick" data-act="toggle-bool" data-entity="input_boolean.vacation_mode" data-on="input_boolean.vacation_mode">${icon(
        "car",
      )} ${escapeHtml(t("quick.vacation"))}</button>`,
    );
  }
  if (exists("input_boolean.window_alert_notification")) {
    buttons.push(
      `<button class="quick" data-act="toggle-bool" data-entity="input_boolean.window_alert_notification" data-on="input_boolean.window_alert_notification">${icon(
        "wind",
      )} ${escapeHtml(t("quick.windowAlert"))}</button>`,
    );
  }
  buttons.push(
    `<button class="quick" data-nav="lys">${icon("light")} ${escapeHtml(
      t("quick.lights"),
    )}</button>`,
  );
  buttons.push(
    `<button class="quick" data-act="map">${icon("map")} ${escapeHtml(
      t("quick.map"),
    )}</button>`,
  );
  return buttons.join("");
}

function roomCard(
  room: RoomModel,
  model: HomeModel,
  language: string,
  t: Translator,
  kind?: string,
): string {
  const stats = statsFor(model, room);
  const temp =
    stats.temp === null ? "–" : formatNumber(stats.temp, 1, language);
  const level = airLevel(stats);
  const lightIds = roomLightIds(room);
  const openIds = room.openings.map((opening) => opening.id);

  const airDot = level === "warn" ? "warn" : level === "off" ? "off" : "";
  const lights = room.lights.length
    ? `<span><i class="sdot ${
        stats.lightsOn ? "" : "off"
      }" data-room-lights="${escapeHtml(lightIds.join(","))}"></i><span data-bind="r_${
        room.id
      }_lights">${escapeHtml(
        t("room.lightsCount", {
          on: stats.lightsOn,
          total: stats.lightsTotal,
        }),
      )}</span></span>`
    : "";
  const openings = room.openings.length
    ? `<span><i class="sdot ${
        stats.open || stats.leak ? "warn" : "off"
      }" data-room-open="${escapeHtml(openIds.join(","))}"></i><span data-bind="r_${
        room.id
      }_open">${escapeHtml(
        stats.leak
          ? t("room.leak")
          : stats.open
            ? t("room.openCount", { count: stats.open })
            : t("room.closed"),
      )}</span></span>`
    : "";

  return `<button class="room-card${room.wide ? " wide" : ""}" style="--room:${
    room.tint
  }" data-nav="rum/${escapeHtml(room.id)}" data-room="${escapeHtml(room.id)}">
      <div class="room-top">
        <div><div class="room-name">${escapeHtml(
          room.name,
        )}</div><div class="room-kind">${escapeHtml(
          kind ?? (room.wide ? t("room.kindWide") : t("room.kind")),
        )}</div></div>
        <span class="room-icon">${icon(room.icon)}</span>
      </div>
      <div class="room-main">
        <div class="room-temp${stats.temp === null ? " off" : ""}" data-bind="r_${
          room.id
        }_temp">${temp}<sup>°</sup></div>
        <div class="room-status">
          <span><i class="sdot ${airDot}"></i><span data-bind="r_${
            room.id
          }_air">${escapeHtml(airText(room, stats, language, t))}</span></span>
          ${lights}
          ${openings}
        </div>
      </div>
      <svg class="room-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path data-spark="roomTemp:${escapeHtml(
          room.id,
        )}" d="" fill="none" stroke="var(--room)" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="room-open">${escapeHtml(t("room.openRoom"))}</span>
    </button>`;
}

function systemCard(
  card: SystemCardModel,
  language: string,
  t: Translator,
): string {
  const temp = refNumber(card.temp?.state);
  const humidity = refNumber(card.humidity?.state);
  const step = refNumber(card.step?.state);
  const sub =
    card.id === "ventilation"
      ? `${t("ventilation.fanStep").toLocaleLowerCase()} ${
          step ?? "–"
        } · ${humidity === null ? "–" : `${Math.round(humidity)} %`}`
      : humidity === null
        ? "–"
        : `${Math.round(humidity)} % ${t("room.humidityShort")}`;
  const route = card.id === "ventilation" ? "ventilation" : "skur";

  return `<button class="room-card" style="--room:${
    card.tint
  }" data-nav="${route}" data-system="${escapeHtml(card.id)}">
      <div class="room-top">
        <div><div class="room-name">${escapeHtml(
          card.name,
        )}</div><div class="room-kind">${escapeHtml(
          card.id === "ventilation" ? "Nilan · luftskifte" : "Ude · klima",
        )}</div></div>
        <span class="room-icon">${icon(card.icon)}</span>
      </div>
      <div class="room-main">
        <div class="room-temp" data-bind="s_${escapeHtml(
          card.id,
        )}_temp">${temp === null ? "–" : formatNumber(temp, 1, language)}<sup>°</sup></div>
        <div class="room-status">
          <span><i class="sdot" data-sys-dot="${escapeHtml(
            card.id,
          )}"></i><span data-bind="s_${escapeHtml(
            card.id,
          )}_sub">${escapeHtml(sub)}</span></span>
        </div>
      </div>
      <svg class="room-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path data-spark="${escapeHtml(
          card.temp?.entityId ?? "",
        )}" d="" fill="none" stroke="var(--room)" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="room-open">${escapeHtml(t("room.openShort"))}</span>
    </button>`;
}

export interface ChapterArtContext {
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  language?: string;
  history?: HistoryCache;
  isOn?: (entityId: string) => boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * The small illustration at the bottom of each chapter card. The home view
 * renders a model-only version for the first paint; the card calls it again
 * with the history cache and live on/off states.
 */
export function renderChapterArt(
  key: ChapterKey | string,
  context: ChapterArtContext,
): string {
  const { model, t } = context;
  const language = context.language ?? languageOf(context.config, t);
  const isOn = context.isOn ?? (() => false);

  if (key === "energi") {
    const price = model.price;
    if (!price || !price.values.length) return "";
    return `<div class="price-bars">${price.values
      .map(
        (value) =>
          `<i style="--bar:${priceColor(
            value,
            price.min,
            price.max,
          )};height:${Math.max(
            6,
            ((value - price.min) / (price.max - price.min || 1)) * 100,
          )}%" title="${escapeHtml(formatPrice(value, language))}"></i>`,
      )
      .join("")}</div>`;
  }

  if (key === "sol") {
    const series = model.solar?.forecastSeries ?? [];
    const max = Math.max(3000, ...series.map((point) => point.v), 1);
    const points = series.map((point) => {
      const fraction = dayFraction(point.t);
      const { x, y } = arcPoint(fraction, 220, 0, 100, 80);
      return `${x.toFixed(1)},${(y - (point.v / max) * 70).toFixed(1)}`;
    });
    const line = points.length ? `M${points.join("L")}` : "";
    const area = points.length ? `${line}L220,100L0,100Z` : "";
    const soc = model.solar?.batterySoc ?? 0;
    return `<svg viewBox="0 0 220 110" preserveAspectRatio="none"><path d="${area}" fill="url(#solarFill)" opacity=".55" stroke="none"/><path d="${line}" fill="none" stroke="var(--amber)" stroke-width="1.2" vector-effect="non-scaling-stroke"/><text x="4" y="96" fill="var(--muted)" font-size="7">${escapeHtml(
      t("solar.battery").toLocaleUpperCase(),
    )} ${formatNumber(soc, 0, language)} %</text></svg>`;
  }

  if (key === "vand") {
    const salt = clamp(model.water?.salt ?? 0, 0, 100);
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><rect x="0" y="38" width="220" height="2" fill="var(--line)"/><rect x="0" y="36" width="${(salt / 100) * 220}" height="6" rx="3" fill="var(--sky)" opacity=".8"/><text x="4" y="24" fill="var(--muted)" font-size="8">${escapeHtml(
      t("water.salt").toLocaleUpperCase(),
    )} ${formatNumber(salt, 0, language)} %</text></svg>`;
  }

  if (key === "sikkerhed") {
    const openings =
      model.security?.openings ?? model.rooms.flatMap((room) => room.openings);
    return `<div class="sec-dots">${openings
      .map(
        (opening) =>
          `<i class="${isOn(opening.id) ? "open" : ""}" title="${escapeHtml(
            opening.name,
          )}"></i>`,
      )
      .join("")}</div>`;
  }

  if (key === "ventilation") {
    const system = model.systemCards.find((card) => card.id === "ventilation");
    const step = model.ventilation?.step ?? refNumber(system?.step?.state) ?? 0;
    return `<div class="zone-strip">${[0, 1, 2, 3, 4]
      .map(
        (index) =>
          `<i style="height:${20 + index * 16}%;opacity:${
            index <= step ? 0.85 : 0.25
          }"></i>`,
      )
      .join("")}</div>`;
  }

  if (key === "teknik") {
    const id = context.config.network?.router;
    const history = id && context.history ? context.history.series(id) : [];
    const values = history.length ? history : [model.tech?.router ?? null];
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="${sparkPath(
      values,
      220,
      52,
      2,
    )}" fill="none" stroke="var(--sky)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  if (key === "oekonomi") {
    const id = context.config.economy?.bond;
    const history = id && context.history ? context.history.series(id) : [];
    const values = history.length ? history : [model.economy?.value ?? null];
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="${sparkPath(
      values,
      220,
      52,
      2,
    )}" fill="none" stroke="var(--brass)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  if (key === "lys") {
    const ids = allLightIds(model.lights);
    return `<div class="light-dots">${ids
      .map((id) => `<i class="${isOn(id) ? "on" : ""}"></i>`)
      .join("")}</div>`;
  }

  if (key === "varme") {
    const zones = [...model.heating, ...model.heatingReserve];
    return `<div class="zone-strip">${zones
      .map((zone) => {
        const current = refNumber(zone.entity.attributes?.current_temperature);
        const target = refNumber(zone.entity.attributes?.temperature);
        const height = clamp(40 + ((current ?? 21) - 19) * 14, 20, 96);
        const warn =
          current !== null && target !== null && current < target - 0.5;
        return `<i class="${warn ? "warn" : ""}" style="height:${height}%" title="${escapeHtml(
          zone.name,
        )}"></i>`;
      })
      .join("")}</div>`;
  }

  if (key === "alarmer") {
    const hasAlerts = model.alerts.length > 0;
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="M0 30 C 20 30, 24 30, 30 30 S 36 12, 44 30 S 52 42, 60 30 S 68 8, 76 30 S 86 36, 94 30 S 104 18, 112 30 S 122 30, 130 30 S 140 10, 148 30 S 158 40, 166 30 S 176 20, 184 30 S 200 30, 220 30" fill="none" stroke="${
      hasAlerts ? "var(--coral)" : "var(--sage)"
    }" stroke-width="1.1" opacity=".7"/></svg>`;
  }

  return "";
}

function dayFraction(date: Date): number {
  return (
    (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / 1440
  );
}

function chapterCard(
  chapter: ChapterDefinition,
  index: number,
  model: HomeModel,
  config: ArcusConfig,
  language: string,
  t: Translator,
): string {
  const title = t(chapter.titleKey);
  const art = renderChapterArt(chapter.key, {
    model,
    config,
    t,
    language,
  });
  const number =
    chapter.key === "alarmer"
      ? t("section.chapterAlertsShort")
      : String(index + 1).padStart(2, "0");

  return `<button class="chapter${chapter.large ? " large" : ""}" data-nav="${
    chapter.route
  }" data-chapter="${chapter.key}">
      <div class="ch-top"><span class="num">${escapeHtml(
        number,
      )}</span><span class="ch-icon">${icon(chapter.icon)}</span></div>
      <h3>${escapeHtml(title)}</h3>
      <div class="sum" data-bind-html="ch_${chapter.key}_sum">–</div>
      <div class="ch-art" data-art="${chapter.key}">${art}</div>
    </button>`;
}

/**
 * The full home view. `hass` is optional so the view can be rendered from a
 * model alone (tests, editor preview); when present it decides which legacy
 * default quick actions have their entities.
 */
export function renderHome(
  model: HomeModel,
  config: ArcusConfig,
  t: Translator,
  hass?: ArcusHass,
): string {
  const language = languageOf(config, t);
  const stars = Array.from({ length: 18 }, (_, index) => {
    const x = [
      8, 18, 27, 36, 45, 54, 63, 71, 79, 86, 92, 14, 31, 58, 68, 76, 88, 4,
    ][index];
    const y = [
      8, 18, 12, 22, 7, 16, 9, 20, 13, 6, 18, 26, 5, 24, 11, 3, 22, 15,
    ][index];
    const delay = (index * 0.37).toFixed(2);
    return `<i class="star" style="left:${x}%;top:${y}%;animation-delay:${delay}s;opacity:${0.2 + (index % 5) * 0.12}"></i>`;
  }).join("");

  const rooms = model.rooms;
  const displayRooms = rooms.filter((room) => room.id !== "skur");
  const skurRoom = rooms.find((room) => room.id === "skur");
  const systemCards = model.systemCards;
  const enabledChapters = CHAPTERS.filter(
    (chapter) => model.chapters[chapter.key],
  );
  const indoorRoute = displayRooms.length
    ? `rum/${displayRooms[0].id}`
    : "alle";

  const roomGrid = rooms.length
    ? `<div class="room-grid">${displayRooms
        .map((room) => roomCard(room, model, language, t))
        .join("")}${systemCards
        .map((card) => systemCard(card, language, t))
        .join("")}${
        skurRoom
          ? roomCard(
              skurRoom,
              model,
              language,
              t,
              `${t("sheet.kickerOutside")} · ${t("room.kind")}`,
            )
          : ""
      }</div>`
    : `<div class="empty">${icon("home")}<div><b>${escapeHtml(
        t("empty.areas"),
      )}</b><br>${escapeHtml(t("empty.areasHint"))}</div></div>`;

  const chapterSection = enabledChapters.length
    ? `<section class="section">
              <div class="section-head">
                <div><div class="kicker">${escapeHtml(
                  t("section.chaptersKicker"),
                )}</div><h2>${escapeHtml(t("section.chaptersTitle"))}</h2></div>
                <div class="meta">${escapeHtml(
                  t("section.chaptersMeta"),
                )}<br><b>${escapeHtml(t("section.chaptersMetaSub"))}</b></div>
              </div>
              <div class="chapter-grid">${enabledChapters
                .map((chapter) =>
                  chapterCard(
                    chapter,
                    CHAPTERS.indexOf(chapter),
                    model,
                    config,
                    language,
                    t,
                  ),
                )
                .join("")}</div>
            </section>`
    : "";

  const quickActions = renderQuickActions(config, t, hass);
  const quickSection = quickActions
    ? `<section class="section">
              <div class="section-head">
                <div><div class="kicker">${escapeHtml(
                  t("section.quickKicker"),
                )}</div><h2>${escapeHtml(t("section.quickTitle"))}</h2></div>
                <div class="meta">${escapeHtml(
                  t("section.quickMeta"),
                )}<br><b>${escapeHtml(t("section.quickMetaSub"))}</b></div>
              </div>
              <div class="quick-row">${quickActions}</div>
            </section>`
    : "";

  return `
      <div class="app" data-atmo="night">
        <div class="sky"></div>
        <div class="stars">${stars}</div>
        <div class="scroll">
          <header class="topbar">
            <div class="topbar-inner">
              <button class="brand" data-nav="hjem" aria-label="${escapeHtml(
                t("brand.homeAria"),
              )}">
                <span class="brand-mark">${icon("sun")}</span>
                <span><span class="brand-word">${escapeHtml(
                  (config.title || "HJEM").toLocaleUpperCase(),
                )}</span><span class="brand-sub">${escapeHtml(
                  (config.subtitle || "ARCUS").toLocaleUpperCase(),
                )}</span></span>
              </button>
              <div class="topbar-date" data-bind="date"></div>
              <div class="topbar-right">
                <span class="pill name"><span class="dot" data-person-dot></span><span data-bind="person">–</span></span>
                <button class="pill warn" data-nav="alarmer" data-alert-pill ${
                  model.alerts.length ? "" : "hidden"
                }><span class="dot"></span><span data-bind="alertPill">${
                  model.alerts.length
                }</span></button>
                <button class="icon-btn" data-act="atmo" data-atmo-btn title="${escapeHtml(
                  t("brand.atmosphere"),
                )}" aria-label="${escapeHtml(
                  t("brand.atmosphere"),
                )}">${icon("spark")}</button>
                <button class="icon-btn" data-nav="alle" aria-label="${escapeHtml(
                  t("brand.allLayers"),
                )}">${icon("menu")}</button>
              </div>
            </div>
          </header>

          <main class="wrap">
            <section class="hero">
              <div class="hero-top">
                <div>
                  <button class="eyebrow" data-nav="bon" aria-label="${escapeHtml(
                    t("hero.seePrayers"),
                  )}"><span data-bind="eyebrow">${escapeHtml(
                    t("hero.eyebrow"),
                  )}</span><span class="eyebrow-arrow">${icon(
                    "chevron",
                  )}</span></button>
                  <h1 class="greeting" data-bind-html="greet"></h1>
                  <div class="hero-date" data-bind="heroDate"></div>
                </div>
                <div class="weather">
                  <span class="weather-icon" data-weather-icon>${icon(
                    "cloud",
                  )}</span>
                  <div>
                    <div class="weather-temp" data-bind="weatherTemp">–</div>
                    <div class="weather-sub" data-bind="weatherSub">–</div>
                  </div>
                </div>
              </div>

              <div class="arc-wrap" data-arc>
                <div class="arc-glow" data-arc-glow></div>
                <div class="orb" data-orb></div>
                <div class="arc-readout" data-arc-readout></div>
                <svg class="arc-svg" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="var(--brass)" stop-opacity=".42"/>
                      <stop offset="1" stop-color="var(--brass)" stop-opacity="0"/>
                    </linearGradient>
                    <clipPath id="pastClip"><rect data-past-clip x="40" y="0" width="0" height="300"/></clipPath>
                  </defs>
                  <path data-arc-line d="" fill="none" stroke="var(--line-strong)" stroke-width="1"/>
                  <path data-arc-past d="" fill="none" stroke="var(--text-2)" stroke-width="1.2" opacity=".7" clip-path="url(#pastClip)"/>
                  <path data-solar-area d="" fill="url(#solarFill)" stroke="none"/>
                  <path data-solar-line d="" fill="none" stroke="var(--amber)" stroke-width="1.4" vector-effect="non-scaling-stroke" opacity=".9"/>
                  <path data-solar-actual d="" fill="none" stroke="var(--text)" stroke-width="1.2" vector-effect="non-scaling-stroke" opacity=".75"/>
                  <g data-prices></g>
                  <g data-prayer-marks></g>
                </svg>
                <div class="now-needle" data-now-needle></div>
                <div class="now-bead" data-now-bead></div>
                <div class="arc-labels" data-arc-labels></div>
                <div class="arc-hours"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
              </div>

              <div class="vitals">
                <button class="vital" data-nav="${escapeHtml(indoorRoute)}">
                  <div class="vital-label">${escapeHtml(t("hero.indoor"))}</div>
                  <div class="vital-value"><span data-bind="indoor">–</span><small>°C</small></div>
                  <div class="vital-sub" data-bind="indoorSub">${escapeHtml(
                    t("hero.indoorSub"),
                  )}</div>
                  <svg class="vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path data-spark="indoor" d="" fill="none" stroke="var(--sky)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
                </button>
                <button class="vital" data-nav="energi">
                  <div class="vital-label">${escapeHtml(
                    t("hero.priceNow"),
                  )}</div>
                  <div class="vital-value"><span data-bind="price">–</span><small>kr</small></div>
                  <div class="vital-sub" data-bind="priceSub">${escapeHtml(
                    t("hero.pricePerKwh"),
                  )}</div>
                  <svg class="vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path data-spark="price" d="" fill="none" stroke="var(--brass)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
                </button>
                <button class="vital" data-nav="sol">
                  <div class="vital-label">${escapeHtml(
                    t("hero.battery"),
                  )}</div>
                  <div class="vital-value"><span data-bind="battery">–</span><small>%</small></div>
                  <div class="vital-sub" data-bind="batterySub">${escapeHtml(
                    t("hero.batterySub"),
                  )}</div>
                  <div class="vital-ring">
                    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--line)" stroke-width="2.5"/><circle data-battery-ring cx="20" cy="20" r="16" fill="none" stroke="var(--sage)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="100.5" stroke-dashoffset="100.5" transform="rotate(-90 20 20)"/></svg>
                  </div>
                </button>
                <button class="vital" data-nav="sol">
                  <div class="vital-label">${escapeHtml(
                    t("hero.solarNow"),
                  )}</div>
                  <div class="vital-value"><span data-bind="solarNow">–</span><small>W</small></div>
                  <div class="vital-sub" data-bind="solarSub">${escapeHtml(
                    t("hero.solarTodayFallback"),
                  )}</div>
                  <svg class="vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path data-spark="solarActual" d="" fill="none" stroke="var(--amber)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
                </button>
              </div>

              <div class="weather-strip" data-bind-html="weatherStrip"></div>
              <div data-alert-slot></div>
            </section>

            <section class="section">
              <div class="section-head">
                <div><div class="kicker">${escapeHtml(
                  t("section.homeKicker"),
                )}</div><h2>${escapeHtml(t("section.roomsTitle"))}</h2></div>
                <div class="meta" data-bind-html="roomsMeta">–</div>
              </div>
              ${roomGrid}
            </section>

            ${chapterSection}
            ${quickSection}

            <footer class="footer">
              <span class="mark">${icon("sun")} ${escapeHtml(
                t("brand.footer"),
              )} · <span data-bind="clock"></span></span>
              <span>${escapeHtml(
                t("brand.homeAssistant"),
              )} · <span data-bind="version">${escapeHtml(
                ARCUS_VERSION,
              )}</span></span>
            </footer>
          </main>
        </div>
        <div class="scrim" data-scrim></div>
        <section class="sheet" data-sheet role="dialog" aria-modal="true" aria-label="${escapeHtml(
          t("sheet.details"),
        )}"></section>
        <div class="toast" data-toast></div>
      </div>`;
}
