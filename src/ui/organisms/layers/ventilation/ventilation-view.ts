import { numberFrom, resolveTempUnit } from "../../../../format";
import type {
  ArcusConfig,
  ArcusHass,
  EntityRef,
  HassEntity,
  HomeModel,
  TemperatureUnit,
  Translator,
  VentilationModel,
} from "../../../../types";

export type SheetLanguage = "da" | "en";

const FILTER_OK = new Set([
  "ok",
  "nej",
  "neutral",
  "off",
  "unknown",
  "unavailable",
]);

export function filterOk(filter: string | null | undefined): boolean {
  return !filter || FILTER_OK.has(filter.toLowerCase());
}

function filterLabel(
  t: Translator,
  filter: string | null | undefined,
): string {
  if (!filter) return "–";
  return filterOk(filter) ? t("ventilation.filterOk") : filter;
}

/** Live number from hass, falling back to the ref snapshot on the model. */
function refNumber(
  hass: ArcusHass,
  ref: EntityRef | null | undefined,
): number | null {
  if (!ref) return null;
  const live = hass.states[ref.entityId]?.state;
  return numberFrom(live) ?? numberFrom(ref.state);
}

function modeLabel(mode: string | null, t: Translator): string {
  if (mode === "heat") return t("ventilation.heating");
  if (mode === "cool") return t("ventilation.cooling");
  return t("ventilation.autoLower");
}

function hasDucts(
  ventilation: VentilationModel,
  config: ArcusConfig,
): boolean {
  if (
    ventilation.outdoor != null ||
    ventilation.inlet != null ||
    ventilation.exhaust != null ||
    ventilation.outlet != null
  ) {
    return true;
  }
  return Boolean(
    config.ventilation?.outdoor ||
      config.ventilation?.inlet ||
      config.ventilation?.exhaust ||
      config.ventilation?.outlet,
  );
}

interface ClimateState {
  climateId: string | undefined;
  climate: HassEntity | undefined;
  mode: string | null;
  fan: string | number | null;
  target: number | null;
  minTemp: number;
  maxTemp: number;
}

function climateState(
  hass: ArcusHass,
  config: ArcusConfig,
  ventilation: VentilationModel,
  fallback: HomeModel["systemCards"][number] | undefined,
): ClimateState {
  const climateId = config.ventilation?.climate ?? fallback?.climate?.entityId;
  const climate = climateId ? hass.states[climateId] : undefined;
  return {
    climateId,
    climate,
    mode: ventilation.climateMode ?? climate?.state ?? null,
    fan: ventilation.fanMode ?? climate?.attributes?.fan_mode ?? null,
    target:
      ventilation.target ?? numberFrom(climate?.attributes?.temperature),
    minTemp: numberFrom(climate?.attributes?.min_temp) ?? 5,
    maxTemp: numberFrom(climate?.attributes?.max_temp) ?? 35,
  };
}

/** Everything the ventilation sheet needs, resolved once per render. */
export interface VentilationView extends ClimateState {
  language: SheetLanguage;
  tempUnit: TemperatureUnit;
  degree: string;
  systemName: string | null;
  temperature: number | null;
  humidity: number | null;
  step: number | null;
  filterValue: string | null;
  status: string;
  resetId: string | undefined;
  hasDucts: boolean;
  modeLabel: string;
}

export function resolveVentilationView(
  hass: ArcusHass,
  model: HomeModel,
  config: ArcusConfig,
  ventilation: VentilationModel,
  t: Translator,
): VentilationView {
  const language: SheetLanguage =
    model.language === "en" || config.language === "en" ? "en" : "da";
  const tempUnit = resolveTempUnit(hass, config);
  const card = model.systemCards.find((entry) => entry.id === "ventilation");
  const filterValue = ventilation.filter ?? card?.filter?.state ?? null;
  const climate = climateState(hass, config, ventilation, card);

  return {
    ...climate,
    language,
    tempUnit,
    degree: tempUnit === "°F" ? "°F" : "°",
    systemName: ventilation.name || config.ventilation?.name || null,
    temperature: ventilation.temperature ?? refNumber(hass, card?.temp),
    humidity: ventilation.humidity ?? refNumber(hass, card?.humidity),
    step: ventilation.step ?? refNumber(hass, card?.step),
    filterValue,
    status: filterLabel(t, filterValue),
    resetId: config.ventilation?.resetButton,
    hasDucts: hasDucts(ventilation, config),
    modeLabel: modeLabel(climate.mode, t),
  };
}
