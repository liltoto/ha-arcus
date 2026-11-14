import { numberFrom } from "../../../../format";
import type { ArcusHass, EntityRef } from "../../../../types";

export interface HeatingReading {
  current: number | null;
  target: number | null;
  min: number;
  max: number;
  mode: string | undefined;
  on: boolean;
  hvacAction: unknown;
}

/** Live state from hass, falling back to the ref snapshot on the model. */
export function liveState(
  hass: ArcusHass,
  entity: EntityRef,
): string | undefined {
  return hass.states?.[entity.entityId]?.state ?? entity.state;
}

export function liveAttributes(
  hass: ArcusHass,
  entity: EntityRef,
): Record<string, unknown> {
  return hass.states?.[entity.entityId]?.attributes ?? entity.attributes ?? {};
}

/** Current/target/limits plus the mode flags shared by heating rows. */
export function heatingReading(
  hass: ArcusHass,
  entity: EntityRef,
): HeatingReading {
  const attributes = liveAttributes(hass, entity);
  const mode = liveState(hass, entity);
  return {
    current: numberFrom(attributes.current_temperature),
    target: numberFrom(attributes.temperature),
    min: numberFrom(attributes.min_temp) ?? 5,
    max: numberFrom(attributes.max_temp) ?? 35,
    mode,
    on: mode !== "off",
    hvacAction: attributes.hvac_action,
  };
}
