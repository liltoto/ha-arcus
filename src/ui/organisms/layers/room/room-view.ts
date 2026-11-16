import { formatNumber, formatUnit, numberFrom } from "../../../../format";
import type {
  ArcusHass,
  EntityRef,
  HassEntity,
  HomeModel,
  Language,
  RoomModel,
  RoomStats,
  Translator,
} from "../../../../types";
import {
  entityName,
  isOn,
  numberOf,
  refEntity,
  roomStatFor,
} from "./room-state";

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** The 24-hour chart entity: the live sensor, then the fallback sensor. */
export const temperatureChartId = (
  hass: ArcusHass,
  room: RoomModel,
): string | undefined => {
  const directTemp = numberOf(hass, room.temp);
  return directTemp !== null
    ? room.temp?.entityId
    : (room.tempFallback?.entityId ?? room.temp?.entityId);
};

export const relativeChanged = (
  hass: ArcusHass,
  t: Translator,
  nowMs: number,
  entityId: string,
): string => {
  const raw = hass.states?.[entityId]?.last_changed;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const minutes = Math.round((nowMs - date.getTime()) / 60_000);
  if (minutes < 2) return t("room.relativeNow");
  if (minutes < 60) return t("room.relativeMinutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("room.relativeHours", { count: hours });
  return t("room.relativeDays", { count: Math.round(hours / 24) });
};

const airSummary = (
  t: Translator,
  humidity: number | null,
  co2: number | null,
  language: Language,
): string => {
  if (co2 !== null) {
    return `${t("room.air")} ${formatUnit(co2, "ppm", language, 0)}`;
  }
  if (humidity !== null) {
    return `${t("room.humidityShort")} ${formatUnit(
      humidity,
      "%",
      language,
      0,
    )}`;
  }
  return `${t("room.air")} –`;
};

/** Everything the room header, readouts, and chart blocks need. */
export interface RoomView {
  stat: RoomStats;
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  pm25: number | null;
  tempChartId: string | undefined;
  summary: string;
  fallbackNote: boolean;
}

export const resolveRoomView = (
  hass: ArcusHass,
  model: HomeModel,
  room: RoomModel,
  t: Translator,
  language: Language,
): RoomView => {
  const stat = roomStatFor(hass, model, room);
  const directTemp = numberOf(hass, room.temp);
  const temp =
    directTemp ??
    stat.temp ??
    numberFrom(room.tempFallback?.attributes?.current_temperature);
  const humidity = numberOf(hass, room.humidity) ?? stat.humidity;
  const co2 = numberOf(hass, room.co2) ?? stat.co2;
  const pm25 = numberOf(hass, room.pm25);

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
  const summary = `${formatNumber(temp, 1, language)}° · ${airSummary(
    t,
    humidity,
    co2,
    language,
  )}${lightsText ? ` · ${lightsText}` : ""}${openText ? ` · ${openText}` : ""}`;

  return {
    stat,
    temp,
    humidity,
    co2,
    pm25,
    tempChartId: temperatureChartId(hass, room),
    summary,
    fallbackNote: Boolean(
      room.tempFallback && directTemp === null && stat.temp !== null,
    ),
  };
};

export interface RoomClimateView {
  ref: EntityRef;
  entity: HassEntity | EntityRef;
  mode: string | undefined;
  targetText: string;
  currentText: string;
}

export const resolveClimateView = (
  hass: ArcusHass,
  ref: EntityRef | null | undefined,
  language: Language,
): RoomClimateView | null => {
  if (!ref) return null;
  const entity = refEntity(hass, ref);
  if (!entity) return null;

  const currentTemp = numberFrom(entity.attributes?.current_temperature);
  const targetTemp = numberFrom(entity.attributes?.temperature);
  return {
    ref,
    entity,
    mode: entity.state,
    targetText:
      targetTemp === null ? "–" : `${formatNumber(targetTemp, 1, language)}°`,
    currentText:
      currentTemp === null ? "–" : `${formatNumber(currentTemp, 1, language)}°`,
  };
};

export interface RoomFanView {
  ref: EntityRef;
  entity: HassEntity | EntityRef;
  on: boolean;
  filterHours: number | null;
  resetId: string | undefined;
}

export const resolveFanView = (
  hass: ArcusHass,
  room: RoomModel,
): RoomFanView | null => {
  const ref = room.fan;
  if (!ref) return null;
  const entity = refEntity(hass, ref);
  if (!entity) return null;

  const resetId = [room.filterAlarm?.entityId, room.filter?.entityId].find(
    (id): id is string => typeof id === "string" && id.startsWith("button."),
  );
  return {
    ref,
    entity,
    on: isOn(hass, ref.entityId, ref),
    filterHours: numberOf(hass, room.filter),
    resetId,
  };
};

export interface RoomMotionView {
  on: boolean;
  lux: number | null;
}

export const resolveMotionView = (
  hass: ArcusHass,
  room: RoomModel,
): RoomMotionView | null => {
  const motion = room.motion;
  if (!motion) return null;
  return {
    on: isOn(hass, motion.entityId, motion),
    lux: numberOf(hass, room.illuminance),
  };
};

export interface RoomBatteryView {
  entity: HassEntity | EntityRef | undefined;
  level: number | null;
}

export const resolveBatteryView = (
  hass: ArcusHass,
  room: RoomModel,
): RoomBatteryView | null => {
  if (!room.battery) return null;
  return {
    entity: refEntity(hass, room.battery),
    level: numberOf(hass, room.battery),
  };
};

export interface RoomMediaView {
  ref: EntityRef;
  entity: HassEntity | EntityRef | undefined;
  state: string | undefined;
  stateText: string;
}

export const resolveMediaView = (
  hass: ArcusHass,
  room: RoomModel,
  t: Translator,
): RoomMediaView | null => {
  const ref = room.media;
  if (!ref) return null;
  const entity = refEntity(hass, ref);
  const state = entity?.state;
  const stateText =
    state === "playing"
      ? t("room.playing")
      : state === "off"
        ? t("room.heatingOff")
        : (state ?? "–");
  return { ref, entity, state, stateText };
};

/** The cover label, falling back to the entity ID. */
export const coverName = (cover: EntityRef, hass: ArcusHass): string => {
  return entityName(refEntity(hass, cover), cover.name ?? cover.entityId);
};
