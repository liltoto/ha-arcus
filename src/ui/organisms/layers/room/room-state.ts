import type {
  ArcusConfig,
  ArcusHass,
  EntityRef,
  HassEntity,
  HomeModel,
  Language,
  RoomModel,
  Translator,
} from "../../../../types";
import type { ArcusRoute } from "../../../types";

/** The computed room card counts, mirroring `views/layers/room.ts`. */
export interface RoomStat {
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  lightsOn: number;
  lightsTotal: number;
  open: number;
  leak: boolean;
}

const ON_STATES = new Set(["on", "open", "home", "playing"]);

export function numberFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function liveEntity(
  hass: ArcusHass,
  entityId: string | null | undefined,
): HassEntity | undefined {
  if (!entityId) return undefined;
  return hass.states?.[entityId];
}

/** The live entity from hass, or the snapshot stored on the model ref. */
export function refEntity(
  hass: ArcusHass,
  ref: EntityRef | null | undefined,
): HassEntity | EntityRef | undefined {
  if (!ref) return undefined;
  return liveEntity(hass, ref.entityId) ?? ref;
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

export function isOnState(state: string | undefined): boolean {
  return typeof state === "string" && ON_STATES.has(state);
}

export function isOn(
  hass: ArcusHass,
  entityId: string | null | undefined,
  fallback?: EntityRef | null,
): boolean {
  const live = liveEntity(hass, entityId);
  if (live) return isOnState(live.state);
  return fallback ? isOnState(fallback.state) : false;
}

/** Prefer the live number, then the model snapshot. */
export function numberOf(
  hass: ArcusHass,
  ref: EntityRef | null | undefined,
): number | null {
  if (!ref) return null;
  const live = numberFrom(liveEntity(hass, ref.entityId)?.state);
  return live ?? numberFrom(ref.state);
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

export function roomStatFor(
  hass: ArcusHass,
  model: HomeModel,
  room: RoomModel,
): RoomStat {
  const stored = ((model.roomStats ?? {}) as Record<string, RoomStat>)[room.id];
  const lightIds = lightIdsFor(room);
  const fallbackTemp = room.tempFallback
    ? numberFrom(
        refEntity(hass, room.tempFallback)?.attributes?.current_temperature,
      )
    : null;

  return {
    temp: numberOf(hass, room.temp) ?? fallbackTemp ?? stored?.temp ?? null,
    humidity: numberOf(hass, room.humidity) ?? stored?.humidity ?? null,
    co2: numberOf(hass, room.co2) ?? stored?.co2 ?? null,
    lightsOn: lightIds.filter((id) => isOn(hass, id)).length,
    lightsTotal: lightIds.length,
    open: room.openings.filter((opening) => isOn(hass, opening.id)).length,
    leak: room.leak ? isOn(hass, room.leak.entityId, room.leak) : false,
  };
}

export function languageOf(
  model: HomeModel,
  config: ArcusConfig,
  t: Translator,
): Language {
  const modelLanguage = model.language;
  if (modelLanguage === "da" || modelLanguage === "en") return modelLanguage;
  if (config.language === "da" || config.language === "en") {
    return config.language;
  }
  return t("common.today") === "I dag" ? "da" : "en";
}

/**
 * `skur` is a top-level sheet route with no sub-segment, so it resolves the
 * skur room directly; every other room uses the route's sub. The prototype
 * fell back to the first discovered room, which is the first non-skur room.
 */
export function resolveRoom(
  model: HomeModel,
  route: ArcusRoute,
): RoomModel | null {
  const target = route.base === "skur" ? "skur" : route.sub;
  return (
    model.rooms.find((room) => room.id === target) ??
    model.rooms.find((room) => room.id !== "skur") ??
    null
  );
}

export interface LightState {
  isOn: boolean;
  pct: number;
}

export function lightStateFor(hass: ArcusHass, entityId: string): LightState {
  const entity = liveEntity(hass, entityId);
  const on = entity?.state === "on";
  const brightness = numberFrom(entity?.attributes?.brightness);
  const pct =
    on && brightness !== null ? Math.round((brightness / 255) * 100) : 0;
  return { isOn: on, pct };
}

export function lightName(hass: ArcusHass, entityId: string): string {
  return entityName(liveEntity(hass, entityId), entityId);
}

export function openingIcon(kind: string): string {
  const normalized = kind.toLowerCase();
  if (/læk|laek|leak|vand|water/.test(normalized)) return "drop";
  if (/vind|window/.test(normalized)) return "wind";
  return "door";
}
