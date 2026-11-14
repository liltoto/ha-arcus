import { formatNumber, numberFrom } from "../../../../format";
import type {
  ArcusHass,
  EntityRef,
  HeatingModel,
  HeatingReserveModel,
  HomeModel,
  Language,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import {
  liveAttributes,
  liveState,
  type HeatingReading,
} from "./heating-state";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const CHART_HEIGHT = 120;

export function temperature(
  value: number | null,
  language: Language,
  unit: TemperatureUnit = "°C",
): string {
  return value === null
    ? "–"
    : `${formatNumber(value, 1, language)}${unit === "°F" ? "°F" : "°"}`;
}

export function isOpeningOn(
  hass: ArcusHass,
  opening: EntityRef | null,
): boolean {
  if (!opening) return false;
  const state = liveState(hass, opening);
  return state === "on" || state === "open";
}

export function refNumber(hass: ArcusHass, entity: EntityRef): number | null {
  return (
    numberFrom(hass.states?.[entity.entityId]?.state) ??
    numberFrom(entity.state)
  );
}

/** The zone subtitle's activity label. */
export function activityFor(reading: HeatingReading, t: Translator): string {
  if (reading.mode === "cool" || reading.hvacAction === "cooling") {
    return t("room.cooling");
  }
  if (reading.hvacAction === "heating") return t("room.heatingActive");
  return t("room.heatingHolding");
}

interface ChartSource {
  entityId: string;
  roomId: string;
  label: string;
}

/**
 * The heating sheet's temperature history. The climate entity itself reports
 * an hvac mode rather than a number, so the chart follows the room temperature
 * sensor of the first zone (the same sensor the card already loads for the
 * home view).
 */
export function chartSource(model: HomeModel): ChartSource | null {
  for (const zone of model.heating) {
    const room = zone.areaId
      ? model.rooms.find(
          (candidate) =>
            candidate.id === zone.areaId || candidate.areaId === zone.areaId,
        )
      : undefined;
    if (room?.temp?.entityId) {
      return {
        entityId: room.temp.entityId,
        roomId: room.id,
        label: room.name,
      };
    }
  }

  const room = model.rooms.find((candidate) => candidate.temp?.entityId);
  if (room?.temp?.entityId) {
    return { entityId: room.temp.entityId, roomId: room.id, label: room.name };
  }
  return null;
}

export interface HeatingLimitsConfig {
  standard?: EntityRef;
  reduced?: EntityRef;
}

/** Optional limit entities carried outside the shared `HomeModel` type. */
export function heatingLimits(
  model: HomeModel,
): HeatingLimitsConfig | undefined {
  return (model as HomeModel & { heatingLimits?: HeatingLimitsConfig })
    .heatingLimits;
}

export interface HeatingStrip {
  values: number[];
  warns: boolean[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Zone-strip heights and warning flags for the zones and reserve channels. */
export function heatingStrip(
  hass: ArcusHass,
  zones: HeatingModel[],
  reserve: HeatingReserveModel[],
): HeatingStrip {
  const values: number[] = [];
  const warns: boolean[] = [];
  for (const zone of [...zones, ...reserve]) {
    const attributes = liveAttributes(hass, zone.entity);
    const current = numberFrom(attributes.current_temperature);
    values.push(clamp(40 + ((current ?? 21) - 19) * 14, 20, 96));
    const target = numberFrom(attributes.temperature);
    warns.push(current !== null && target !== null && current < target - 0.5);
  }
  return { values, warns };
}
