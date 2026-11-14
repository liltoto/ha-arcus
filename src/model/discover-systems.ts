import type {
  ArcusConfig,
  ArcusHass,
  PrayersConfig,
  PriceConfig,
  SecurityConfig,
  SolarConfig,
  VentilationConfig,
  WaterConfig,
} from "../types";
import { isEntityAvailable } from "./discover";

const PREFERRED_WEATHER_IDS = [
  "weather.forecast_home",
  "weather.home",
  "weather.forecast_hjem",
] as const;

const PRAYER_KEYS = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "sunrise",
] as const;

const OPENING_DEVICE_CLASSES = new Set([
  "door",
  "window",
  "garage_door",
  "opening",
]);

const HOME_BATTERY_RE =
  /battery_soc|inverter.*battery|powerwall|luna|deye|sunmate|solis|fronius|growatt|victron|enphase/i;

const SENSOR_BATTERY_EXCLUDE_RE =
  /door|window|dor|dør|vindue|motion|bevaegelse|bevægelse|tilstedevaerelse|leak|water_leak|moisture|button|knap|temp_hmd|smoke|co2|air_quality|lock|lås|remote/i;

const EV_BATTERY_RE =
  /tesla|wall_connector|ev_battery|car_battery|vehicle|elbil/i;

const VENTILATION_UNIT_RE =
  /nilan|vallox|dantherm|flexit|duka|komfovent|ventilation|hrv|erv/i;

function domainOf(entityId: string): string {
  return entityId.includes(".") ? entityId.slice(0, entityId.indexOf(".")) : "";
}

function isEligible(hass: ArcusHass, entityId: string): boolean {
  const state = hass.states?.[entityId];
  if (!state || !isEntityAvailable(state.state)) return false;
  const reg = hass.entities?.[entityId];
  if (reg?.hidden_by || reg?.disabled_by) return false;
  return true;
}

function eligibleIds(hass: ArcusHass, domain: string): string[] {
  const out: string[] = [];
  for (const entityId of Object.keys(hass.states ?? {})) {
    if (domainOf(entityId) !== domain) continue;
    if (!isEligible(hass, entityId)) continue;
    out.push(entityId);
  }
  return out;
}

function attrOf(hass: ArcusHass, entityId: string, key: string): unknown {
  return hass.states?.[entityId]?.attributes?.[key];
}

function deviceClassOf(hass: ArcusHass, entityId: string): string {
  const raw = attrOf(hass, entityId, "device_class");
  return typeof raw === "string" ? raw : "";
}

function unitOf(hass: ArcusHass, entityId: string): string {
  const raw = attrOf(hass, entityId, "unit_of_measurement");
  return typeof raw === "string" ? raw : "";
}

function friendlyNameOf(hass: ArcusHass, entityId: string): string {
  const state = hass.states?.[entityId];
  const reg = hass.entities?.[entityId];
  return (
    String(state?.attributes?.friendly_name ?? "").trim() ||
    String(reg?.name ?? "").trim() ||
    String(reg?.original_name ?? "").trim() ||
    ""
  );
}

function hasNonEmptyData(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length > 0;
  }
  return false;
}

function findMatch(
  hass: ArcusHass,
  ids: string[],
  pattern: RegExp,
  predicate?: (id: string) => boolean,
): string | undefined {
  const pool = predicate ? ids.filter(predicate) : ids;
  const byId = pool.find((id) => pattern.test(id));
  if (byId) return byId;
  return pool.find((id) => pattern.test(friendlyNameOf(hass, id)));
}

function findPowerMatch(
  hass: ArcusHass,
  sensors: string[],
  pattern: RegExp,
  predicate?: (id: string) => boolean,
): string | undefined {
  const strict = findMatch(
    hass,
    sensors,
    pattern,
    (id) =>
      deviceClassOf(hass, id) === "power" && (predicate ? predicate(id) : true),
  );
  if (strict) return strict;
  return findMatch(
    hass,
    sensors,
    pattern,
    (id) =>
      !deviceClassOf(hass, id) &&
      /^(W|kW)$/i.test(unitOf(hass, id)) &&
      (predicate ? predicate(id) : true),
  );
}

function findEnergyMatch(
  hass: ArcusHass,
  sensors: string[],
  pattern: RegExp,
  predicate?: (id: string) => boolean,
): string | undefined {
  const strict = findMatch(
    hass,
    sensors,
    pattern,
    (id) =>
      deviceClassOf(hass, id) === "energy" &&
      (predicate ? predicate(id) : true),
  );
  if (strict) return strict;
  return findMatch(
    hass,
    sensors,
    pattern,
    (id) =>
      !deviceClassOf(hass, id) &&
      /^(Wh|kWh|MWh)$/i.test(unitOf(hass, id)) &&
      (predicate ? predicate(id) : true),
  );
}

function discoverWeather(hass: ArcusHass): string | undefined {
  for (const preferred of PREFERRED_WEATHER_IDS) {
    if (isEligible(hass, preferred)) return preferred;
  }
  return eligibleIds(hass, "weather")[0];
}

function discoverPrice(hass: ArcusHass): PriceConfig | undefined {
  const sensors = eligibleIds(hass, "sensor");
  const binarySensors = eligibleIds(hass, "binary_sensor");

  const forecast = sensors.find((id) => {
    const attrs = hass.states?.[id]?.attributes ?? {};
    return (
      hasNonEmptyData(attrs.raw_today) ||
      hasNonEmptyData(attrs.today) ||
      hasNonEmptyData(attrs.prices) ||
      hasNonEmptyData(attrs.forecast)
    );
  });

  const isNotSubPrice = (id: string) =>
    !/sell|lowest|highest|next|previous/i.test(id);

  const current =
    findMatch(
      hass,
      sensors,
      /electricity.*total.*price|current.*electricity.*price|elpris/i,
      isNotSubPrice,
    ) ??
    findMatch(
      hass,
      sensors,
      /spot.*price|nord_?pool|energi_data_service/i,
      isNotSubPrice,
    ) ??
    forecast;

  if (!current && !forecast) return undefined;

  const price: PriceConfig = {};
  if (current) price.current = current;
  if (forecast) price.forecast = forecast;

  const sell = findMatch(
    hass,
    sensors,
    /electricity.*sell.*price|sell.*electricity.*price|sell.*price|salgspris/i,
  );
  const spot = findMatch(
    hass,
    sensors,
    /spot.*price|nord_?pool.*current.*price/i,
  );
  const lowest = findMatch(
    hass,
    sensors,
    /nord_?pool.*lowest.*price|lowest.*electricity.*price|electricity.*lowest.*price|lowest.*price/i,
  );
  const highest = findMatch(
    hass,
    sensors,
    /nord_?pool.*highest.*price|highest.*electricity.*price|electricity.*highest.*price|highest.*price/i,
  );
  const next = findMatch(
    hass,
    sensors,
    /nord_?pool.*next.*price|next.*electricity.*price|electricity.*next.*price|next.*price/i,
  );
  const previous = findMatch(
    hass,
    sensors,
    /nord_?pool.*previous.*price|previous.*electricity.*price|electricity.*previous.*price|previous.*price/i,
  );
  const tomorrow = findMatch(
    hass,
    binarySensors,
    /tomorrow.*price|nord_?pool.*tomorrow/i,
  );

  if (sell) price.sell = sell;
  if (spot) price.spot = spot;
  if (lowest) price.lowest = lowest;
  if (highest) price.highest = highest;
  if (next) price.next = next;
  if (previous) price.previous = previous;
  if (tomorrow) price.tomorrow = tomorrow;

  return price;
}

function setIfDefined<T extends object>(
  target: T,
  key: keyof T,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  (target as Record<keyof T, unknown>)[key] = value;
}

function isHomeBatterySensor(hass: ArcusHass, entityId: string): boolean {
  if (deviceClassOf(hass, entityId) !== "battery") return false;
  const text = `${entityId} ${friendlyNameOf(hass, entityId)}`;
  if (SENSOR_BATTERY_EXCLUDE_RE.test(text)) return false;
  return (
    HOME_BATTERY_RE.test(entityId) ||
    HOME_BATTERY_RE.test(friendlyNameOf(hass, entityId))
  );
}

function solarForecastToday(
  hass: ArcusHass,
  sensors: string[],
): string | undefined {
  const series = sensors.find(
    (id) =>
      hasNonEmptyData(attrOf(hass, id, "watts")) &&
      !/tomorrow|d2|d3|remaining/i.test(id),
  );
  return (
    series ??
    findMatch(
      hass,
      sensors,
      /energy_production_today|solcast.*today|forecast.*solar.*today/i,
      (id) => !/remaining|tomorrow/i.test(id),
    )
  );
}

function discoverSolar(hass: ArcusHass): SolarConfig | undefined {
  const sensors = eligibleIds(hass, "sensor");
  const forecastToday = solarForecastToday(hass, sensors);
  const forecastTomorrow = findMatch(
    hass,
    sensors,
    /energy_production_tomorrow|solcast.*tomorrow|forecast.*solar.*tomorrow/i,
  );
  const power = findPowerMatch(
    hass,
    sensors,
    /pv.*power|solar.*power|inverter.*power/i,
    (id) => !/pv[1-4]|mppt[1-4]/i.test(id),
  );
  const today = findEnergyMatch(
    hass,
    sensors,
    /daily_production|solar.*today|pv.*today|sol.*i_dag/i,
    (id) => !/forecast|solcast/i.test(id),
  );
  const batterySoc = sensors.find((id) => isHomeBatterySensor(hass, id));
  const batteryPower = findPowerMatch(
    hass,
    sensors,
    /battery.*power|batteri.*effekt/i,
  );
  const load = findPowerMatch(
    hass,
    sensors,
    /load.*power|house.*load|home.*power|huset.*bruger/i,
  );
  const grid = findPowerMatch(hass, sensors, /grid.*power|net.*power/i);
  const pv1 = findMatch(hass, sensors, /pv1.*power|mppt1/i);
  const pv2 = findMatch(hass, sensors, /pv2.*power|mppt2/i);
  const pv3 = findMatch(hass, sensors, /pv3.*power|mppt3/i);
  const pv4 = findMatch(hass, sensors, /pv4.*power|mppt4/i);

  const hasAny = [
    power,
    today,
    forecastToday,
    batterySoc,
    pv1,
    pv2,
    pv3,
    pv4,
  ].some(Boolean);
  if (!hasAny) return undefined;

  const solar: SolarConfig = {};
  setIfDefined(solar, "power", power);
  setIfDefined(solar, "today", today);
  setIfDefined(solar, "forecastToday", forecastToday);
  setIfDefined(solar, "forecastTomorrow", forecastTomorrow);
  setIfDefined(solar, "batterySoc", batterySoc);
  setIfDefined(solar, "batteryPower", batteryPower);
  setIfDefined(solar, "load", load);
  setIfDefined(solar, "grid", grid);
  setIfDefined(solar, "pv1", pv1);
  setIfDefined(solar, "pv2", pv2);
  setIfDefined(solar, "pv3", pv3);
  setIfDefined(solar, "pv4", pv4);
  return solar;
}

function discoverWater(hass: ArcusHass): WaterConfig | undefined {
  const sensors = eligibleIds(hass, "sensor").filter((id) => !/leak/i.test(id));

  const total =
    sensors.find((id) => deviceClassOf(hass, id) === "water") ??
    findMatch(
      hass,
      sensors,
      /water.*total|bwt.*total_output|vand.*total/i,
      (id) => !/udgift|cost|price|pris/i.test(id),
    );
  const day = findMatch(
    hass,
    sensors,
    /water.*day|water.*today|bwt.*day_output|vand.*dag/i,
  );
  const month = findMatch(hass, sensors, /water.*month|bwt.*month_output/i);
  const flow = findMatch(hass, sensors, /water.*flow|bwt.*current_flow/i);
  const state = findMatch(hass, sensors, /bwt.*state|softener.*state/i);
  const salt = findMatch(
    hass,
    sensors,
    /bwt.*regenerativ_level|softener.*salt|salt.*level/i,
  );
  const saltDays = findMatch(
    hass,
    sensors,
    /bwt.*regenerativ_days|salt.*days/i,
  );

  const water: WaterConfig = {};
  if (total) water.total = total;
  if (day) water.day = day;
  if (month) water.month = month;
  if (flow) water.flow = flow;
  if (state) water.state = state;
  if (salt) water.salt = salt;
  if (saltDays) water.saltDays = saltDays;

  return Object.keys(water).length > 0 ? water : undefined;
}

function discoverVentilation(hass: ArcusHass): VentilationConfig | undefined {
  const unitId =
    findMatch(hass, eligibleIds(hass, "climate"), VENTILATION_UNIT_RE) ??
    findMatch(hass, eligibleIds(hass, "fan"), VENTILATION_UNIT_RE);
  if (!unitId) return undefined;

  const unitDeviceId = hass.entities?.[unitId]?.device_id ?? null;
  const objectId = unitId.slice(unitId.indexOf(".") + 1);
  const prefix = objectId.split("_")[0] ?? "";
  const allSensors = eligibleIds(hass, "sensor");

  const sameDevice = unitDeviceId
    ? allSensors.filter((id) => hass.entities?.[id]?.device_id === unitDeviceId)
    : [];
  const namedSensors = allSensors.filter(
    (id) =>
      !sameDevice.includes(id) &&
      (VENTILATION_UNIT_RE.test(id) ||
        VENTILATION_UNIT_RE.test(friendlyNameOf(hass, id)) ||
        (prefix.length >= 3 && id.startsWith(`sensor.${prefix}_`))),
  );
  const candidates = [...sameDevice, ...namedSensors];

  const notFanSpeed = (id: string) => !/fan|speed|hastighed|rpm|step/i.test(id);

  const outdoor = findMatch(
    hass,
    candidates,
    /outdoor.*temp|outside.*temp|udetemp|outdoor/i,
  );
  const inlet = findMatch(
    hass,
    candidates,
    /inlet.*temp|supply.*temp|inlet_after_heater|inlet|supply|indtag|indblæs/i,
    notFanSpeed,
  );
  const exhaust = findMatch(
    hass,
    candidates,
    /exhaust.*temp|extract.*temp|exhaust|extract|afkast|udsugning/i,
    notFanSpeed,
  );
  const outlet = findMatch(
    hass,
    candidates,
    /outlet.*temp|discharge.*temp|outlet|discharge|udblæs/i,
    notFanSpeed,
  );
  const temperature = findMatch(
    hass,
    candidates,
    /room.*temp|actual.*temp|indoor.*temp|rumtemp|temperature|temp/i,
    (id) =>
      !/outdoor|outside|inlet|supply|exhaust|extract|outlet|discharge/i.test(
        id,
      ),
  );
  const humidity = findMatch(hass, candidates, /humidity|fugt/i);
  const step = findMatch(hass, candidates, /fan.*step|step|trin/i);
  const filter = findMatch(
    hass,
    candidates,
    /filter.*status|filter.*alarm.*status|air_filter|filter/i,
    (id) => !/days_since|days_to|dage_siden|dage_til/i.test(id),
  );
  const efficiency = findMatch(
    hass,
    candidates,
    /efficiency|effektivitet|virkningsgrad/i,
  );

  const ventilation: VentilationConfig = { climate: unitId };
  if (temperature) ventilation.temperature = temperature;
  if (humidity) ventilation.humidity = humidity;
  if (step) ventilation.step = step;
  if (filter) ventilation.filter = filter;
  if (outdoor) ventilation.outdoor = outdoor;
  if (inlet) ventilation.inlet = inlet;
  if (exhaust) ventilation.exhaust = exhaust;
  if (outlet) ventilation.outlet = outlet;
  if (efficiency) ventilation.efficiency = efficiency;

  return ventilation;
}

function discoverPrayers(hass: ArcusHass): PrayersConfig | undefined {
  const sensors = eligibleIds(hass, "sensor");
  const prayers: PrayersConfig = {};

  for (const key of PRAYER_KEYS) {
    const match = sensors.find((id) =>
      new RegExp(`^sensor\\..*${key}`, "i").test(id),
    );
    if (match) prayers[key] = match;
  }

  return Object.keys(prayers).length >= 3 ? prayers : undefined;
}

function hasOpeningContext(
  hass: ArcusHass,
  config: ArcusConfig,
  binarySensors: string[],
): boolean {
  const sensor = binarySensors.some((id) =>
    OPENING_DEVICE_CLASSES.has(deviceClassOf(hass, id)),
  );
  const configured = Boolean(
    config.security?.windows || config.security?.windowAlert,
  );
  const overridden = Object.values(config.rooms ?? {}).some(
    (room) => (room.openings?.length ?? 0) > 0,
  );
  return sensor || configured || overridden;
}

function hasRoomLeakContext(config: ArcusConfig): boolean {
  return Object.values(config.rooms ?? {}).some((room) =>
    Boolean(room.leak || room.lock),
  );
}

function excludedBatteryIds(
  config: ArcusConfig,
  solarBatterySoc: string | undefined,
): Set<string> {
  const ids = [
    solarBatterySoc,
    config.solar?.batterySoc,
    config.energy?.ev?.soc,
  ].filter((id): id is string => typeof id === "string" && id.length > 0);
  return new Set(ids);
}

function isSecurityBattery(
  hass: ArcusHass,
  id: string,
  excluded: Set<string>,
): boolean {
  if (deviceClassOf(hass, id) !== "battery") return false;
  if (excluded.has(id)) return false;
  if (isHomeBatterySensor(hass, id)) return false;
  return !EV_BATTERY_RE.test(`${id} ${friendlyNameOf(hass, id)}`);
}

function discoverSecurityBatteries(
  hass: ArcusHass,
  config: ArcusConfig,
  solarBatterySoc: string | undefined,
  hasContext: boolean,
): string[] {
  if (!hasContext) return [];
  const excluded = excludedBatteryIds(config, solarBatterySoc);
  return eligibleIds(hass, "sensor").filter((id) =>
    isSecurityBattery(hass, id, excluded),
  );
}

function assignSecurityField<T extends "leaks" | "locks" | "batteries">(
  security: SecurityConfig,
  key: T,
  current: string[] | undefined,
  discovered: string[],
): void {
  if (current !== undefined || !discovered.length) return;
  security[key] = discovered;
}

function hasAnySecurityField(security: SecurityConfig): boolean {
  if (security.windowAlert || security.windows || security.alarm) return true;
  return Boolean(
    security.leaks?.length ||
    security.locks?.length ||
    security.batteries?.length,
  );
}

function discoverSecurity(
  hass: ArcusHass,
  config: ArcusConfig,
): SecurityConfig | undefined {
  const existing = config.security;
  const binarySensors = eligibleIds(hass, "binary_sensor");
  const leaks =
    existing?.leaks ??
    binarySensors.filter((id) => deviceClassOf(hass, id) === "moisture");
  const locks = existing?.locks ?? eligibleIds(hass, "lock");
  const alarm = existing?.alarm ?? eligibleIds(hass, "alarm_control_panel")[0];
  const hasContext =
    hasOpeningContext(hass, config, binarySensors) ||
    leaks.length > 0 ||
    locks.length > 0 ||
    Boolean(alarm) ||
    hasRoomLeakContext(config);
  const batteries = discoverSecurityBatteries(
    hass,
    config,
    config.solar?.batterySoc,
    hasContext,
  );

  const security: SecurityConfig = { ...existing };
  assignSecurityField(security, "leaks", existing?.leaks, leaks);
  assignSecurityField(security, "locks", existing?.locks, locks);
  assignSecurityField(security, "batteries", existing?.batteries, batteries);
  if (!security.alarm && alarm) security.alarm = alarm;

  return hasAnySecurityField(security) ? security : undefined;
}

/**
 * Auto-discover system sections (`weather`, `price`, `solar`, `water`,
 * `ventilation`, `prayers`, `security`) from `hass.states` when not already
 * configured. Returns a shallow clone and never mutates `config` in place.
 */
type SystemFiller = (hass: ArcusHass, config: ArcusConfig) => ArcusConfig;

function fillWeather(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  if (config.weather) return config;
  const weather = discoverWeather(hass);
  return weather ? { ...config, weather } : config;
}

function fillPrice(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  if (config.price) return config;
  const price = discoverPrice(hass);
  return price ? { ...config, price } : config;
}

function fillSolar(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  if (config.solar) return config;
  const solar = discoverSolar(hass);
  return solar ? { ...config, solar } : config;
}

function fillWater(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  if (config.water) return config;
  const water = discoverWater(hass);
  return water ? { ...config, water } : config;
}

function fillVentilation(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  if (config.ventilation) return config;
  const ventilation = discoverVentilation(hass);
  return ventilation ? { ...config, ventilation } : config;
}

function fillPrayers(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  if (config.prayers) return config;
  const prayers = discoverPrayers(hass);
  return prayers ? { ...config, prayers } : config;
}

function fillSecurity(hass: ArcusHass, config: ArcusConfig): ArcusConfig {
  const security = discoverSecurity(hass, config);
  return security ? { ...config, security } : config;
}

const FILLERS: SystemFiller[] = [
  fillWeather,
  fillPrice,
  fillSolar,
  fillWater,
  fillVentilation,
  fillPrayers,
  fillSecurity,
];

export function discoverSystems(
  hass: ArcusHass,
  config: ArcusConfig,
): ArcusConfig {
  if (config.auto_discover === false) return config;
  return FILLERS.reduce((next, fill) => fill(hass, next), { ...config });
}
