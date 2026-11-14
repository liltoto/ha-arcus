import { formatUnit, numberFromState } from "../format";
import type {
  HomeModel,
  RoomModel,
  SystemCardModel,
  Translator,
} from "../types";
import type { RoomView } from "./view-types";

/** Shape of `model.roomStats` at runtime; the model interface keeps it loose. */
export interface RoomStatsLike {
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  lightsOn: number;
  lightsTotal: number;
  open: number;
  leak: boolean;
}

/**
 * Presentation data for the ventilation and outdoor system cards. The
 * components never reach into the model or the live hass state.
 */
export interface SystemCardView {
  id: string;
  name: string;
  kind: string;
  icon: string;
  tint: string;
  temp: number | null;
  tempEntity: string;
  sub: string;
  route: string;
  openLabel: string;
  language: string;
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

function statsFor(model: HomeModel, room: RoomModel): RoomStatsLike {
  const all = (model.roomStats ?? {}) as Record<string, RoomStatsLike>;
  const stored = all[room.id];
  if (stored) return stored;

  const lightIds = roomLightIds(room);
  return {
    temp:
      numberFromState(room.temp?.state) ??
      numberFromState(room.tempFallback?.attributes?.current_temperature),
    humidity: numberFromState(room.humidity?.state),
    co2: numberFromState(room.co2?.state),
    lightsOn: 0,
    lightsTotal: lightIds.length,
    open: 0,
    leak: room.leak?.state === "on" || room.leak?.state === "open",
  };
}

function airLevel(stats: RoomStatsLike): RoomView["air"] {
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

/**
 * Build one home room tile from the discovered room and its live stats.
 * Mirrors legacy `roomCard()` copy, including the leak/closed priority.
 */
export function roomView(
  room: RoomModel,
  model: HomeModel,
  language: string,
  t: Translator,
  kind?: string,
): RoomView {
  const stats = statsFor(model, room);
  return {
    id: room.id,
    name: room.name,
    kind: kind ?? (room.wide ? t("room.kindWide") : t("room.kind")),
    icon: room.icon,
    tint: room.tint,
    wide: room.wide,
    temp: stats.temp,
    air: airLevel(stats),
    airLabel: airText(room, stats, language, t),
    lightsOn: stats.lightsOn,
    lightsTotal: stats.lightsTotal,
    lightsLabel: room.lights.length
      ? t("room.lightsCount", {
          on: stats.lightsOn,
          total: stats.lightsTotal,
        })
      : undefined,
    open: stats.open,
    openLabel: room.openings.length
      ? stats.leak
        ? t("room.leak")
        : stats.open
          ? t("room.openCount", { count: stats.open })
          : t("room.closed")
      : "",
    spark: [],
  };
}

/**
 * Build the ventilation/outdoor card. The same markup serves both ids; only
 * the navigation route, kind line, and sub text change.
 */
export function systemCardView(
  card: SystemCardModel,
  language: string,
  t: Translator,
): SystemCardView {
  const humidity = numberFromState(card.humidity?.state);
  const step = numberFromState(card.step?.state);
  const sub =
    card.id === "ventilation"
      ? `${t("ventilation.fanStep").toLocaleLowerCase()} ${
          step ?? "–"
        } · ${humidity === null ? "–" : `${Math.round(humidity)} %`}`
      : humidity === null
        ? "–"
        : `${Math.round(humidity)} % ${t("room.humidityShort")}`;

  return {
    id: card.id,
    name: card.name,
    kind: card.id === "ventilation" ? "Nilan · luftskifte" : "Ude · klima",
    icon: card.icon,
    tint: card.tint,
    temp: numberFromState(card.temp?.state),
    tempEntity: card.temp?.entityId ?? "",
    sub,
    route: card.id === "ventilation" ? "ventilation" : "skur",
    openLabel: t("room.openShort"),
    language,
  };
}
