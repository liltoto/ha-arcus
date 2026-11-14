import { formatNumber, resolveCurrency } from "../../../../format";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Language,
  SecurityBatteryModel,
  Translator,
  WaterModel,
} from "../../../../types";

type WaterFormat = (
  value: number | null | undefined,
  digits?: number,
) => string;

interface LeakRowView {
  entityId: string;
  name: string;
  on: boolean;
}

export interface WaterView {
  day: number | null;
  month: number | null;
  total: number | null;
  cost: number | null;
  flow: number | null;
  salt: number | null;
  saltDays: number | null;
  capacity: number | null;
  state: string;
  holidayId: string | undefined;
  holidayOn: boolean;
  softenerTitle: string;
  hasSoftener: boolean;
  leaks: LeakRowView[];
  leak: boolean;
  leakBattery: SecurityBatteryModel | undefined;
  currency: string;
  fmt: WaterFormat;
  summary: string;
}

const ON_STATES = new Set(["on", "open", "home", "playing", "heating", "heat"]);

function entityState(hass: ArcusHass, entityId: string): string | null {
  const state = hass.states[entityId]?.state;
  return typeof state === "string" ? state : null;
}

/** The live on/off state, with a numeric fallback for sensors without "on". */
function isOn(hass: ArcusHass, entityId: string, fallback = false): boolean {
  const state = entityState(hass, entityId);
  if (state === null) return fallback;
  if (ON_STATES.has(state)) return true;
  const value = Number(state);
  return Number.isFinite(value) && value > 0;
}

function friendlyNameOf(hass: ArcusHass, entityId: string): string | null {
  const friendly = hass.states[entityId]?.attributes?.friendly_name;
  return typeof friendly === "string" && friendly.trim() ? friendly : null;
}

function entityAreaId(hass: ArcusHass, entityId: string): string | null {
  const entry = hass.entities?.[entityId];
  if (entry?.area_id) return entry.area_id;
  const deviceId = entry?.device_id;
  return deviceId ? (hass.devices?.[deviceId]?.area_id ?? null) : null;
}

function areaNameForEntity(hass: ArcusHass, entityId: string): string | null {
  const areaId = entityAreaId(hass, entityId);
  if (!areaId) return null;
  const name = hass.areas?.[areaId]?.name;
  return typeof name === "string" && name.trim() ? name : null;
}

function entityName(
  hass: ArcusHass,
  entityId: string,
  index: number,
  t: Translator,
): string {
  const friendly = friendlyNameOf(hass, entityId);
  if (friendly) return friendly;
  const registry = hass.entities?.[entityId]?.name;
  if (typeof registry === "string" && registry.trim()) return registry;
  const area = areaNameForEntity(hass, entityId);
  if (area) return area;
  if (index === 0) return t("water.kitchen");
  if (index === 1) return t("water.utility");
  return `${t("water.leak")} ${index + 1}`;
}

function waterFormat(language: Language): WaterFormat {
  return (value, digits = 1) => formatNumber(value, digits, language);
}

interface WaterNumbers {
  day: number | null;
  month: number | null;
  total: number | null;
  cost: number | null;
  flow: number | null;
  salt: number | null;
  saltDays: number | null;
  capacity: number | null;
}

function waterNumbers(water: WaterModel): WaterNumbers {
  return {
    day: water.day ?? null,
    month: water.month ?? null,
    total: water.total ?? null,
    cost: water.cost ?? null,
    flow: water.flow ?? null,
    salt: water.salt ?? null,
    saltDays: water.saltDays ?? null,
    capacity: water.capacity ?? null,
  };
}

function hasSoftener(
  water: WaterModel,
  numbers: WaterNumbers,
  holidayId: string | undefined,
  customName: string | null,
): boolean {
  return Boolean(
    water.state ||
    numbers.salt !== null ||
    numbers.saltDays !== null ||
    numbers.capacity !== null ||
    holidayId ||
    customName,
  );
}

function leakRows(
  hass: ArcusHass,
  config: ArcusConfig,
  t: Translator,
  leak: boolean,
): LeakRowView[] {
  return (config.security?.leaks ?? []).map((entityId, index) => ({
    entityId,
    name: entityName(hass, entityId, index, t),
    on: isOn(hass, entityId, leak),
  }));
}

function leakBatteryFor(model: HomeModel): SecurityBatteryModel | undefined {
  return model.security?.batteries?.find((battery) =>
    /klippbok|water|leak/i.test(battery.entityId),
  );
}

function waterSummary(
  t: Translator,
  fmt: WaterFormat,
  numbers: WaterNumbers,
  state: string,
  softener: boolean,
  customName: string | null,
): string {
  if (!softener) {
    return t("water.meterSummary", {
      day: fmt(numbers.day, 1),
      month: fmt(numbers.month, 0),
    });
  }
  const summary = t("water.summary", {
    day: fmt(numbers.day, 1),
    state,
    salt: fmt(numbers.salt, 0),
  });
  return customName ? summary.replace("BWT", customName) : summary;
}

/** Everything the water sheet renders, resolved once per render. */
export function resolveWaterView(
  hass: ArcusHass,
  model: HomeModel,
  config: ArcusConfig,
  water: WaterModel,
  t: Translator,
): WaterView {
  const language = model.language;
  const fmt = waterFormat(language);
  const numbers = waterNumbers(water);
  const state = water.state || "–";
  const holidayId = config.water?.holiday;
  const customName = water.softenerName || config.water?.softenerName || null;
  const softener = hasSoftener(water, numbers, holidayId, customName);
  const leak = Boolean(model.security?.leak);

  return {
    ...numbers,
    state,
    holidayId,
    holidayOn: holidayId
      ? isOn(hass, holidayId, Boolean(water.holiday))
      : Boolean(water.holiday),
    softenerTitle: customName || t("water.bwt"),
    hasSoftener: softener,
    leaks: leakRows(hass, config, t, leak),
    leak,
    leakBattery: leakBatteryFor(model),
    currency: resolveCurrency(hass, config, language),
    fmt,
    summary: waterSummary(t, fmt, numbers, state, softener, customName),
  };
}
