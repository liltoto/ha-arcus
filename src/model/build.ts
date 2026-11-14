import { createTranslator, resolveLanguage } from "../localize";
import type {
  AlertModel,
  ArcusConfig,
  ArcusHass,
  ChapterKey,
  EntityRef,
  HeatingModel,
  HeatingReserveModel,
  HomeModel,
  LightGroupModel,
  OpeningModel,
  PrayerTimeModel,
  PrayersModel,
  PriceModel,
  RoomModel,
  SecurityBatteryModel,
  SecurityModel,
  SkurModel,
  SolarModel,
  SolarPoint,
  SystemCardModel,
  TechModel,
  VentilationModel,
  WaterModel,
  WeatherModel,
} from "../types";
import {
  ROOM_TINTS,
  discoverRooms,
  entitiesForArea,
  isEntityAvailable,
  resolveEntityRef,
} from "./discover";

const MAX_CHEAP_HOURS = 3;

const PRAYER_DEFINITIONS = [
  { id: "fajr", key: "prayers.fajr" },
  { id: "dhuhr", key: "prayers.dhuhr" },
  { id: "asr", key: "prayers.asr" },
  { id: "maghrib", key: "prayers.maghrib" },
  { id: "isha", key: "prayers.isha" },
] as const;

interface RoomStats {
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  lightsOn: number;
  lightsTotal: number;
  open: number;
  leak: boolean;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stateOf(hass: ArcusHass, entityId: string | undefined | null) {
  return entityId ? hass.states?.[entityId] : undefined;
}

function attributesOf(
  hass: ArcusHass,
  entityId: string | undefined | null,
): Record<string, any> {
  return stateOf(hass, entityId)?.attributes ?? {};
}

function numberFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function numState(
  hass: ArcusHass,
  entityId: string | undefined | null,
): number | null {
  const state = stateOf(hass, entityId);
  if (!state || !isEntityAvailable(state.state)) return null;
  return numberFrom(state.state);
}

function stringState(
  hass: ArcusHass,
  entityId: string | undefined | null,
): string | null {
  const state = stateOf(hass, entityId);
  return state ? state.state : null;
}

function isOnState(state: string | undefined | null): boolean {
  return state === "on" || state === "open";
}

function refNumber(value: unknown): number | null {
  return numberFrom(value);
}

function refStateIsOn(ref: EntityRef | null | undefined): boolean {
  return !!ref && isOnState(ref.state);
}

function refIsAvailable(ref: EntityRef | null | undefined): boolean {
  return !!ref && isEntityAvailable(ref.state);
}

function entityAreaId(hass: ArcusHass, entityId: string): string | null {
  const entry = hass.entities?.[entityId];
  if (!entry) return null;
  if (entry.area_id) return entry.area_id;
  if (entry.device_id) return hass.devices?.[entry.device_id]?.area_id ?? null;
  return null;
}

function areaOrderMap(hass: ArcusHass, config: ArcusConfig): Map<string, number> {
  const order = new Map<string, number>();
  let rank = 0;
  for (const areaId of config.areas.order) {
    if (!order.has(areaId)) order.set(areaId, rank++);
  }
  for (const areaId of Object.keys(hass.areas ?? {})) {
    if (!order.has(areaId)) order.set(areaId, rank++);
  }
  return order;
}

function nameOf(
  hass: ArcusHass,
  entityId: string,
  fallback?: string | null,
): string {
  const state = hass.states?.[entityId];
  const registry = hass.entities?.[entityId];
  return (
    String(state?.attributes?.friendly_name ?? "").trim() ||
    String(registry?.name ?? "").trim() ||
    String(registry?.original_name ?? "").trim() ||
    fallback ||
    entityId
  );
}

function lightStats(
  hass: ArcusHass,
  groups: LightGroupModel[],
): { on: number; total: number } {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const group of groups) {
    if (group.members.length) {
      for (const member of group.members) add(member);
    } else {
      add(group.entityId);
    }
    for (const extra of group.extra) add(extra);
  }
  return {
    on: ids.filter((id) => isOnState(hass.states?.[id]?.state)).length,
    total: ids.length,
  };
}

function effectiveRoomTemp(room: RoomModel): number | null {
  if (refIsAvailable(room.temp)) {
    const value = refNumber(room.temp?.state);
    if (value !== null) return value;
  }
  const fallback = refNumber(
    room.tempFallback?.attributes?.current_temperature,
  );
  return fallback;
}

function roomStats(hass: ArcusHass, room: RoomModel): RoomStats {
  const lights = lightStats(hass, room.lights);
  return {
    temp: effectiveRoomTemp(room),
    humidity: refIsAvailable(room.humidity)
      ? refNumber(room.humidity?.state)
      : null,
    co2: refIsAvailable(room.co2) ? refNumber(room.co2?.state) : null,
    lightsOn: lights.on,
    lightsTotal: lights.total,
    open: room.openings.filter((opening) =>
      isOnState(hass.states?.[opening.id]?.state),
    ).length,
    leak: refStateIsOn(room.leak),
  };
}

/* ------------------------------------------------------------------ */
/* Price                                                              */
/* ------------------------------------------------------------------ */

interface PriceRow {
  hour: number;
  price: number;
}

function hourOf(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.getHours();
    const number = Number(value);
    if (Number.isFinite(number)) return Math.trunc(number);
  }
  return fallback;
}

function priceFrom(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function priceRows(value: unknown): PriceRow[] {
  if (!Array.isArray(value)) return [];
  const rows: PriceRow[] = [];
  value.forEach((item, index) => {
    if (isRecord(item)) {
      const price = priceFrom(
        item.price ?? item.value ?? item.total ?? item.spot,
      );
      if (price === null) return;
      rows.push({
        hour: hourOf(
          item.hour ?? item.start ?? item.time ?? item.datetime,
          index,
        ),
        price,
      });
      return;
    }
    const price = priceFrom(item);
    if (price !== null) rows.push({ hour: index, price });
  });
  return rows
    .filter((row) => row.hour >= 0 && row.hour <= 23)
    .sort((a, b) => a.hour - b.hour);
}

function curveFrom(hass: ArcusHass, entityId: string | undefined): PriceRow[] {
  if (!entityId) return [];
  const attributes = attributesOf(hass, entityId);
  for (const source of [
    attributes.raw_today,
    attributes.today,
    attributes.prices,
    attributes.forecast,
  ]) {
    const rows = priceRows(source);
    if (rows.length) return rows;
  }
  return [];
}

function cheapestWindow(
  values: number[],
  fromHour: number,
  count = MAX_CHEAP_HOURS,
): PriceModel["cheapest"] {
  if (values.length < count) return null;
  let best: { start: number; end: number; avg: number; sum: number } | null =
    null;
  const lastStart = Math.min(values.length - count, 23 - count + 1);
  for (let start = Math.max(0, fromHour); start <= lastStart; start++) {
    const slice = values.slice(start, start + count);
    if (slice.length !== count) continue;
    const sum = slice.reduce((total, value) => total + value, 0);
    if (!best || sum < best.sum) {
      best = { start, end: start + count, sum, avg: sum / count };
    }
  }
  if (!best) {
    const slice = values.slice(0, count);
    const sum = slice.reduce((total, value) => total + value, 0);
    best = { start: 0, end: count, sum, avg: sum / count };
  }
  return best;
}

function buildPrice(
  hass: ArcusHass,
  config: ArcusConfig,
  now: Date,
): PriceModel | undefined {
  const priceConfig = config.price;
  if (!priceConfig) return undefined;

  const forecastId = priceConfig.forecast;
  const current =
    numState(hass, priceConfig.current) ??
    numState(hass, forecastId) ??
    null;
  const rows = curveFrom(hass, forecastId);

  if (!rows.length && current === null) return undefined;

  const nowHour = Math.max(0, Math.min(23, now.getHours()));
  let values: number[];
  if (rows.length) {
    const byHour = new Map<number, number>();
    for (const row of rows) {
      if (!byHour.has(row.hour)) byHour.set(row.hour, row.price);
    }
    const first = rows[0].price;
    const currentCurve =
      byHour.get(nowHour) ?? byHour.values().next().value ?? first;
    const offset = current !== null ? current - currentCurve : 0;
    values = Array.from({ length: 24 }, (_, hour) => {
      const value = byHour.get(hour) ?? first;
      return value + offset;
    });
  } else {
    values = Array.from({ length: 24 }, () => current as number);
  }

  const nowPrice = current ?? values[nowHour] ?? values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const cheapest = cheapestWindow(values, nowHour);

  const tomorrowAttributes = attributesOf(hass, forecastId);
  const rawTomorrow = tomorrowAttributes.raw_tomorrow;
  const tomorrowAvailable =
    isOnState(stringState(hass, priceConfig.tomorrow)) ||
    tomorrowAttributes.tomorrow_valid === true ||
    (Array.isArray(rawTomorrow)
      ? rawTomorrow.length > 0
      : isRecord(rawTomorrow) && Object.keys(rawTomorrow).length > 0);

  return {
    values,
    min,
    max,
    now: nowPrice,
    buy: nowPrice,
    sell: numState(hass, priceConfig.sell),
    spot: numState(hass, priceConfig.spot),
    forecast: values,
    lowest: numState(hass, priceConfig.lowest),
    highest: numState(hass, priceConfig.highest),
    next: numState(hass, priceConfig.next),
    previous: numState(hass, priceConfig.previous),
    tomorrow: tomorrowAvailable,
    cheapest,
  };
}

/* ------------------------------------------------------------------ */
/* Weather, prayers, solar, water, security, tech, economy, ventilation */
/* ------------------------------------------------------------------ */

function weatherIcon(condition: string | undefined): string {
  switch (condition) {
    case "sunny":
    case "clear":
      return "sun";
    case "clear-night":
    case "night":
      return "moon";
    case "rainy":
    case "pouring":
    case "lightning-rainy":
    case "snowy-rainy":
      return "rain";
    case "snowy":
    case "hail":
      return "snow";
    default:
      return "cloud";
  }
}

function buildWeather(
  hass: ArcusHass,
  config: ArcusConfig,
): WeatherModel | undefined {
  if (!config.weather) return undefined;
  const state = stateOf(hass, config.weather);
  if (!state) return undefined;
  const attributes = state.attributes ?? {};
  const forecast = Array.isArray(attributes.forecast)
    ? attributes.forecast
    : undefined;
  return {
    state: state.state,
    temp: numberFrom(attributes.temperature),
    humidity: numberFrom(attributes.humidity),
    wind: numberFrom(attributes.wind_speed),
    pressure: numberFrom(attributes.pressure),
    icon: weatherIcon(state.state),
    text: state.state,
    forecast,
  };
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function buildPrayers(
  hass: ArcusHass,
  config: ArcusConfig,
  now: Date,
  t: ReturnType<typeof createTranslator>,
): PrayersModel | undefined {
  const prayerConfig = config.prayers;
  if (!prayerConfig) return undefined;

  const times: PrayerTimeModel[] = [];
  for (const definition of PRAYER_DEFINITIONS) {
    const entityId = prayerConfig[definition.id];
    if (!entityId) continue;
    const raw = stringState(hass, entityId);
    if (!raw || !isEntityAvailable(raw)) continue;
    const time = new Date(raw);
    if (Number.isNaN(time.getTime())) continue;
    times.push({
      id: definition.id,
      name: t(definition.key),
      time,
      minutes: minutesOfDay(time),
      entityId,
    });
  }
  times.sort((a, b) => a.time.getTime() - b.time.getTime());

  let next = times.find((prayer) => prayer.time.getTime() > now.getTime());
  if (!next && times.length) {
    const fajr = times.find((prayer) => prayer.id === "fajr") ?? times[0];
    const tomorrow = new Date(fajr.time);
    tomorrow.setDate(tomorrow.getDate() + 1);
    next = {
      ...fajr,
      time: tomorrow,
      minutes: fajr.minutes,
    };
  }

  const sunriseRaw = stringState(hass, prayerConfig.sunrise);
  const sunrise = sunriseRaw ? new Date(sunriseRaw) : null;
  return {
    times,
    next: next ?? null,
    sunrise:
      sunrise && !Number.isNaN(sunrise.getTime()) ? sunrise : null,
  };
}

function parseWatts(hass: ArcusHass, entityId: string | undefined): SolarPoint[] {
  if (!entityId) return [];
  const watts = attributesOf(hass, entityId).watts;
  const points: SolarPoint[] = [];

  if (Array.isArray(watts)) {
    for (const item of watts) {
      if (isRecord(item)) {
        const rawTime = item.t ?? item.time ?? item.datetime;
        const value = numberFrom(item.v ?? item.value ?? item.watts);
        if (!rawTime || value === null) continue;
        const time = new Date(rawTime);
        if (Number.isNaN(time.getTime())) continue;
        points.push({ t: time, v: value });
      } else {
        const value = numberFrom(item);
        if (value === null) continue;
      }
    }
  } else if (isRecord(watts)) {
    for (const [rawTime, rawValue] of Object.entries(watts)) {
      const time = new Date(rawTime);
      const value = numberFrom(rawValue);
      if (Number.isNaN(time.getTime()) || value === null) continue;
      points.push({ t: time, v: value });
    }
  }

  return points.sort((a, b) => a.t.getTime() - b.t.getTime());
}

const SOLAR_NUMERIC_KEYS = [
  "power",
  "today",
  "forecastToday",
  "forecastTomorrow",
  "batterySoc",
  "load",
  "grid",
  "batteryPower",
  "pv3",
  "pv4",
  "totalProduction",
  "month",
  "year",
  "batteryTemperature",
  "batteryVoltage",
  "batteryCurrent",
  "batteryCharge",
  "batteryDischarge",
  "batteryMinSoc",
  "batteryMaxSoc",
  "inverterTemperature",
  "inverterFrequency",
  "wifiSignal",
  "uptime",
  "gridL1",
  "gridL2",
  "gridL3",
  "pv3Voltage",
  "pv3Current",
  "pv4Voltage",
  "pv4Current",
  "forecastRemaining",
  "forecastNow",
  "forecastCurrentHour",
  "forecastNextHour",
  "forecastNext24h",
  "forecastD2",
  "forecastD3",
  "savingsTotal",
  "savingsSolar",
  "savingsBattery",
  "savingsRate",
  "investmentSolar",
  "investmentBattery",
  "paybackPercent",
] as const;

function buildSolar(hass: ArcusHass, config: ArcusConfig): SolarModel | undefined {
  const solarConfig = config.solar;
  if (!solarConfig) return undefined;

  const solar: SolarModel = {
    power: null,
    today: null,
    forecastToday: null,
    forecastTomorrow: null,
    batterySoc: null,
    load: null,
    grid: null,
    batteryPower: null,
    pv3: null,
    pv4: null,
    totalProduction: null,
    month: null,
    year: null,
  };

  for (const key of SOLAR_NUMERIC_KEYS) {
    solar[key] = numState(hass, solarConfig[key]);
  }

  if (solarConfig.inverterModel) {
    solar.inverterModel =
      stringState(hass, solarConfig.inverterModel) ?? null;
  }
  if (solarConfig.dataloggerVersion) {
    solar.dataloggerVersion =
      stringState(hass, solarConfig.dataloggerVersion) ?? null;
  }
  if (solarConfig.installedAt) {
    solar.installedAt =
      stringState(hass, solarConfig.installedAt) ?? null;
  }
  if (solarConfig.heliosPath) {
    solar.heliosPath = solarConfig.heliosPath;
  }

  const forecastSeries = parseWatts(hass, solarConfig.forecastToday);
  const tomorrowSeries = parseWatts(hass, solarConfig.forecastTomorrow);
  if (forecastSeries.length) solar.forecastSeries = forecastSeries;
  if (tomorrowSeries.length) solar.tomorrowSeries = tomorrowSeries;

  return solar;
}

function buildWater(hass: ArcusHass, config: ArcusConfig): WaterModel | undefined {
  const waterConfig = config.water;
  if (!waterConfig) return undefined;
  return {
    state: stringState(hass, waterConfig.state),
    flow: numState(hass, waterConfig.flow),
    day: numState(hass, waterConfig.day),
    month: numState(hass, waterConfig.month),
    year: numState(hass, waterConfig.year),
    total: numState(hass, waterConfig.total),
    cost: numState(hass, waterConfig.cost),
    salt: numState(hass, waterConfig.salt),
    saltDays: numState(hass, waterConfig.saltDays),
    capacity: numState(hass, waterConfig.capacity),
    holiday: waterConfig.holiday
      ? isOnState(stringState(hass, waterConfig.holiday))
      : undefined,
  };
}

function buildSecurity(
  hass: ArcusHass,
  config: ArcusConfig,
  rooms: RoomModel[],
  stats: Record<string, RoomStats>,
): SecurityModel | undefined {
  const openings: OpeningModel[] = rooms.flatMap((room) => room.openings);
  const configuredLeaks = config.security?.leaks ?? [];
  const leak =
    rooms.some((room) => stats[room.id]?.leak) ||
    configuredLeaks.some((entityId) =>
      isOnState(stringState(hass, entityId)),
    );

  if (!openings.length && !config.security) return undefined;

  const batteries: SecurityBatteryModel[] = (
    config.security?.batteries ?? []
  ).map((entityId) => {
    const ref = resolveEntityRef(hass, entityId);
    return {
      entityId,
      name: ref?.name ?? entityId,
      level: refIsAvailable(ref) ? refNumber(ref?.state) : null,
    };
  });

  const open = rooms.reduce(
    (count, room) => count + (stats[room.id]?.open ?? 0),
    0,
  );
  const windows = numState(hass, config.security?.windows);

  return {
    open,
    leak,
    openings,
    batteries,
    windowAlert: config.security?.windowAlert
      ? isOnState(stringState(hass, config.security.windowAlert))
      : false,
    windows: windows ?? open,
  };
}

function buildTech(hass: ArcusHass, config: ArcusConfig): TechModel | undefined {
  const network = config.network;
  if (!network) return undefined;
  const routerState = network.routerState
    ? stringState(hass, network.routerState)
    : null;
  return {
    router: numState(hass, network.router),
    google: numState(hass, network.google),
    cloudflare: numState(hass, network.cloudflare),
    packetLoss: numState(hass, network.packetLoss),
    packetLoss7d: numState(hass, network.packetLoss7d),
    jitter: numState(hass, network.jitter),
    routerOnline:
      network.routerState && routerState !== null
        ? isOnState(routerState)
        : undefined,
    wifiSignal: numState(hass, network.wifiSignal),
    uptime: numState(hass, network.uptime),
    temperature: numState(hass, network.temperature),
    frequency: numState(hass, network.frequency),
    inverterModel: network.inverterModel
      ? stringState(hass, network.inverterModel)
      : null,
    dataloggerVersion: network.dataloggerVersion
      ? stringState(hass, network.dataloggerVersion)
      : null,
  };
}

function buildEconomy(
  hass: ArcusHass,
  config: ArcusConfig,
): HomeModel["economy"] {
  const economy = config.economy;
  if (!economy) return undefined;
  return {
    value: numState(hass, economy.bond),
    change: numState(hass, economy.change),
    yield: numState(hass, economy.yield),
    duration: numState(hass, economy.duration),
  };
}

function buildVentilation(
  hass: ArcusHass,
  config: ArcusConfig,
): VentilationModel | undefined {
  const ventilation = config.ventilation;
  if (!ventilation) return undefined;

  const climateState = stateOf(hass, ventilation.climate);
  const climateAttributes = climateState?.attributes ?? {};
  return {
    temperature: numState(hass, ventilation.temperature),
    humidity: numState(hass, ventilation.humidity),
    step: numState(hass, ventilation.step),
    filter: ventilation.filter ? stringState(hass, ventilation.filter) : null,
    filterAlarm: ventilation.filterAlarm
      ? stringState(hass, ventilation.filterAlarm)
      : null,
    climateMode: climateState?.state ?? null,
    fanMode: climateAttributes.fan_mode ?? null,
    target: numberFrom(climateAttributes.temperature),
    outdoor: numState(hass, ventilation.outdoor),
    inlet: numState(hass, ventilation.inlet),
    exhaust: numState(hass, ventilation.exhaust),
    outlet: numState(hass, ventilation.outlet),
    efficiency: numState(hass, ventilation.efficiency),
    daysSinceFilter: numState(hass, ventilation.daysSinceFilter),
    daysToFilter: numState(hass, ventilation.daysToFilter),
    inletFan: numState(hass, ventilation.inletFan),
    exhaustFan: numState(hass, ventilation.exhaustFan),
    aggregateType: ventilation.aggregateType
      ? stringState(hass, ventilation.aggregateType)
      : null,
    operationMode: ventilation.operationMode
      ? stringState(hass, ventilation.operationMode)
      : null,
    software: ventilation.software
      ? stringState(hass, ventilation.software)
      : null,
    userFunction: ventilation.userFunction
      ? stringState(hass, ventilation.userFunction)
      : null,
    userFunction2: ventilation.userFunction2
      ? stringState(hass, ventilation.userFunction2)
      : null,
    userTime: numState(hass, ventilation.userTime),
    userSpeed: numState(hass, ventilation.userSpeed),
    resetButton: ventilation.resetButton
      ? stringState(hass, ventilation.resetButton)
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Heating                                                            */
/* ------------------------------------------------------------------ */

function climateOpening(
  hass: ArcusHass,
  climateId: string,
  areaId: string | null,
): EntityRef | null {
  if (!areaId) return null;
  const entries = entitiesForArea(hass, areaId).filter(
    (entity) => entity.entity_id.startsWith("binary_sensor."),
  );
  const climateDevice = hass.entities?.[climateId]?.device_id;
  const matches = (entityId: string) =>
    /åbn|abn|opening|vindu|window/i.test(
      `${entityId} ${nameOf(hass, entityId)}`,
    );
  const sameDevice = entries.find(
    (entity) =>
      matches(entity.entity_id) &&
      climateDevice &&
      entity.device_id === climateDevice,
  );
  const match =
    sameDevice ?? entries.find((entity) => matches(entity.entity_id));
  return match ? resolveEntityRef(hass, match.entity_id) : null;
}

function climateEntries(hass: ArcusHass): Array<{
  id: string;
  name: string;
  areaId: string | null;
}> {
  return Object.keys(hass.states ?? {})
    .filter((id) => id.startsWith("climate."))
    .map((id) => ({
      id,
      name: nameOf(hass, id),
      areaId: entityAreaId(hass, id),
    }));
}

function configuredReserveIds(config: ArcusConfig): string[] {
  const extra = config as unknown as {
    heating?: { reserve?: unknown };
    heatingReserve?: unknown;
  };
  const raw = extra.heating?.reserve ?? extra.heatingReserve;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is string => typeof item === "string" && !!item.trim(),
  );
}

function buildHeating(
  hass: ArcusHass,
  config: ArcusConfig,
): {
  heating: HeatingModel[];
  heatingReserve: HeatingReserveModel[];
} {
  const order = areaOrderMap(hass, config);
  const ventilationClimate = config.ventilation?.climate;
  const configuredReserve = configuredReserveIds(config);
  const reserveSet = new Set(configuredReserve);
  const heating: HeatingModel[] = [];
  const reserve: HeatingReserveModel[] = [];

  const entries = climateEntries(hass)
    .map((entry) => ({
      ...entry,
      rank: entry.areaId ? (order.get(entry.areaId) ?? 9999) : 10000,
    }))
    .sort((a, b) => a.rank - b.rank);

  for (const entry of entries) {
    if (entry.id === ventilationClimate) continue;
    if (/nilan|tesla/i.test(`${entry.id} ${entry.name}`)) continue;
    const reserveMatch = /kanal|reserve/i.test(`${entry.id} ${entry.name}`);
    const available = isEntityAvailable(stateOf(hass, entry.id)?.state);
    if (
      reserveMatch ||
      reserveSet.has(entry.id) ||
      configuredReserve.includes(entry.id)
    ) {
      if (available) {
        reserve.push({
          name: entry.name,
          entity: resolveEntityRef(hass, entry.id) as EntityRef,
        });
      }
      continue;
    }

    const attributes = attributesOf(hass, entry.id);
    const hvacModes = Array.isArray(attributes.hvac_modes)
      ? attributes.hvac_modes.map(String)
      : [];
    if (!hvacModes.includes("heat")) continue;

    heating.push({
      name: entry.name,
      entity: resolveEntityRef(hass, entry.id) as EntityRef,
      opening: climateOpening(hass, entry.id, entry.areaId),
      areaId: entry.areaId ?? undefined,
    });
  }

  // The configured reserve list is authoritative when it is present.
  if (configuredReserve.length) {
    reserve.length = 0;
    for (const id of configuredReserve) {
      if (!isEntityAvailable(stateOf(hass, id)?.state)) continue;
      reserve.push({
        name: nameOf(hass, id),
        entity: resolveEntityRef(hass, id) as EntityRef,
      });
    }
  }

  return { heating, heatingReserve: reserve };
}

/* ------------------------------------------------------------------ */
/* System cards, alerts, chapters                                      */
/* ------------------------------------------------------------------ */

function buildSystemCards(
  hass: ArcusHass,
  config: ArcusConfig,
): SystemCardModel[] {
  if (!config.ventilation) return [];
  const ventilation = config.ventilation;
  return [
    {
      id: "ventilation",
      name: "Ventilation",
      icon: "fan",
      tint: ROOM_TINTS[0] ?? "#7FAFC4",
      temp: resolveEntityRef(hass, ventilation.temperature),
      humidity: resolveEntityRef(hass, ventilation.humidity),
      step: resolveEntityRef(hass, ventilation.step),
      filter: resolveEntityRef(hass, ventilation.filter),
      filterAlarm: resolveEntityRef(hass, ventilation.filterAlarm),
      climate: resolveEntityRef(hass, ventilation.climate),
    },
  ];
}

function buildAlerts(
  hass: ArcusHass,
  config: ArcusConfig,
  rooms: RoomModel[],
  solar: SolarModel | undefined,
  water: WaterModel | undefined,
  security: SecurityModel | undefined,
  tech: TechModel | undefined,
  t: ReturnType<typeof createTranslator>,
): AlertModel[] {
  const alerts: AlertModel[] = [];

  for (const room of rooms) {
    if (!refStateIsOn(room.leak)) continue;
    const kitchen = room.id === "kokken";
    alerts.push({
      sev: 3,
      key: `leak_${room.id}`,
      title: kitchen
        ? t("alerts.leakKitchenTitle")
        : room.id === "bryggers"
          ? t("alerts.leakUtilityTitle")
          : `${t("water.leak")} · ${room.name}`,
      text: kitchen
        ? t("alerts.leakKitchenText")
        : room.id === "bryggers"
          ? t("alerts.leakUtilityText")
          : t("water.waterDetected"),
      route: `rum/${room.id}`,
    });
  }

  // Configured leak sensors that are not part of a room still produce an alert.
  const roomLeakIds = new Set(
    rooms.map((room) => room.leak?.entityId).filter(Boolean),
  );
  for (const entityId of config.security?.leaks ?? []) {
    if (roomLeakIds.has(entityId)) continue;
    if (!isOnState(stringState(hass, entityId))) continue;
    alerts.push({
      sev: 3,
      key: `leak_${entityId}`,
      title: t("water.leak"),
      text: t("water.waterDetected"),
      route: "vand",
    });
  }

  const open = security?.open ?? 0;
  if (open > 0) {
    alerts.push({
      sev: 2,
      key: "windows",
      title: t(
        open === 1 ? "alerts.windowsTitleOne" : "alerts.windowsTitleOther",
        { count: open },
      ),
      text: t("alerts.windowsText"),
      route: "sikkerhed",
    });
  }

  const filterState = stringState(hass, config.ventilation?.filter);
  const filterAlarm = isOnState(
    stringState(hass, config.ventilation?.filterAlarm),
  );
  if (
    (filterState &&
      !["OK", "Nej", "Neutral", "off", "unknown", "unavailable"].includes(
        filterState,
      )) ||
    filterAlarm
  ) {
    alerts.push({
      sev: 2,
      key: "nilanfilter",
      title: t("alerts.filterTitle"),
      text: t("alerts.filterText", {
        status: filterState ?? t("alerts.filterTitle"),
      }),
      route: "ventilation",
    });
  }

  const bwtState = water?.state;
  if (bwtState && bwtState !== "OK") {
    alerts.push({
      sev: 3,
      key: "bwt",
      title: t("alerts.bwtTitle", { state: bwtState.toLowerCase() }),
      text: t("alerts.bwtText"),
      route: "vand",
    });
  }

  if (water?.salt !== null && water?.salt !== undefined && water.salt < 15) {
    alerts.push({
      sev: 2,
      key: "salt",
      title: t("alerts.saltTitle"),
      text: t("alerts.saltText", { percent: Math.round(water.salt) }),
      route: "vand",
    });
  }

  if (
    solar?.batterySoc !== null &&
    solar?.batterySoc !== undefined &&
    solar.batterySoc < 15
  ) {
    alerts.push({
      sev: 1,
      key: "battery",
      title: t("alerts.batteryTitle"),
      text: t("alerts.batteryText", { percent: Math.round(solar.batterySoc) }),
      route: "sol",
    });
  }

  if (tech?.routerOnline === false) {
    alerts.push({
      sev: 2,
      key: "router",
      title: t("alerts.routerTitle"),
      text: t("alerts.routerText"),
      route: "teknik",
    });
  }

  const cloudflareId = config.network?.cloudflare;
  const cloudflareState = stringState(hass, cloudflareId);
  if (
    cloudflareId &&
    (!cloudflareState || cloudflareState === "unavailable" || cloudflareState === "unknown")
  ) {
    alerts.push({
      sev: 1,
      key: "cf",
      title: t("alerts.cloudflareTitle"),
      text: t("alerts.cloudflareText"),
      route: "teknik",
    });
  }

  return alerts.sort((a, b) => b.sev - a.sev);
}

function hasAnyNumber(values: Array<number | null | undefined>): boolean {
  return values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
}

function buildChapters(
  config: ArcusConfig,
  model: {
    lights: LightGroupModel[];
    heating: HeatingModel[];
    heatingReserve: HeatingReserveModel[];
    systemCards: SystemCardModel[];
    price?: PriceModel;
    solar?: SolarModel;
    water?: WaterModel;
    security?: SecurityModel;
    tech?: TechModel;
    economy?: HomeModel["economy"];
    ventilation?: VentilationModel;
    alerts: AlertModel[];
  },
): Record<ChapterKey, boolean> {
  const hasPrice = !!model.price && model.price.values.length > 0;
  const hasSolar =
    !!model.solar &&
    (hasAnyNumber([
      model.solar.power,
      model.solar.today,
      model.solar.forecastToday,
      model.solar.forecastTomorrow,
      model.solar.batterySoc,
      model.solar.load,
      model.solar.grid,
      model.solar.batteryPower,
      model.solar.pv3,
      model.solar.pv4,
    ]) ||
      !!model.solar.forecastSeries?.length);
  const hasWater =
    !!model.water &&
    (model.water.state !== null ||
      hasAnyNumber([
        model.water.flow,
        model.water.day,
        model.water.month,
        model.water.year,
        model.water.total,
        model.water.cost,
        model.water.salt,
      ]));
  const hasSecurity =
    !!model.security &&
    ((model.security.openings?.length ?? 0) > 0 ||
      !!model.security.leak ||
      !!model.security.batteries?.length ||
      !!model.security.windowAlert);
  const hasVentilation =
    model.systemCards.some((card) => card.id === "ventilation") ||
    !!model.ventilation;
  const hasTech =
    !!model.tech &&
    (hasAnyNumber([
      model.tech.router,
      model.tech.google,
      model.tech.cloudflare,
      model.tech.packetLoss,
      model.tech.packetLoss7d,
      model.tech.jitter,
      model.tech.wifiSignal,
      model.tech.uptime,
      model.tech.temperature,
      model.tech.frequency,
    ]) ||
      model.tech.routerOnline !== undefined);
  const hasEconomy =
    !!model.economy &&
    hasAnyNumber([
      model.economy.value,
      model.economy.change,
      model.economy.yield,
      model.economy.duration,
    ]);

  const chapters: Record<ChapterKey, boolean> = {
    energi: hasPrice,
    sol: hasSolar,
    vand: hasWater,
    sikkerhed: hasSecurity,
    ventilation: hasVentilation,
    teknik: hasTech,
    oekonomi: hasEconomy,
    lys: model.lights.length > 0,
    varme: model.heating.length > 0 || model.heatingReserve.length > 0,
    alarmer: model.alerts.length > 0,
  };

  for (const [key, enabled] of Object.entries(config.chapters)) {
    if (typeof enabled === "boolean") {
      chapters[key as ChapterKey] = enabled;
    }
  }
  return chapters;
}

/**
 * Build the complete home model from the HA registries and the normalized
 * config. `now` is injectable for tests and for the card's midnight refresh;
 * production callers can omit it.
 */
export function buildModel(
  hass: ArcusHass,
  config: ArcusConfig,
  now: Date = new Date(),
): HomeModel {
  const language = resolveLanguage(hass.language, config);
  const t = createTranslator(language);

  const rooms = discoverRooms(hass, config);
  const lights = rooms.flatMap((room) => room.lights);
  const { heating, heatingReserve } = buildHeating(hass, config);
  const systemCards = buildSystemCards(hass, config);

  const stats: Record<string, RoomStats> = {};
  for (const room of rooms) stats[room.id] = roomStats(hass, room);

  const price = buildPrice(hass, config, now);
  const weather = buildWeather(hass, config);
  const prayers = buildPrayers(hass, config, now, t);
  const solar = buildSolar(hass, config);
  const water = buildWater(hass, config);
  const security = buildSecurity(hass, config, rooms, stats);
  const tech = buildTech(hass, config);
  const economy = buildEconomy(hass, config);
  const ventilation = buildVentilation(hass, config);
  const skurRoom = rooms.find((room) => room.id === "skur");
  const skur: SkurModel | null = skurRoom
    ? { temp: skurRoom.temp ?? null, humidity: skurRoom.humidity ?? null }
    : null;

  const alerts = buildAlerts(
    hass,
    config,
    rooms,
    solar,
    water,
    security,
    tech,
    t,
  );

  const lightSummary = lightStats(hass, lights);
  const chapters = buildChapters(config, {
    lights,
    heating,
    heatingReserve,
    systemCards,
    price,
    solar,
    water,
    security,
    tech,
    economy,
    ventilation,
    alerts,
  });

  const model: HomeModel = {
    rooms,
    lights,
    heating,
    heatingReserve,
    systemCards,
    skur,
    weather,
    price,
    energy: price,
    solar,
    prayers,
    water,
    security,
    tech,
    economy,
    ventilation,
    alerts,
    chapters,
    // Extra, non-interface state used by the flat bindings. The shared types
    // deliberately keep RoomModel/LightGroupModel small; the home model is the
    // place that knows the live states behind those refs.
    language,
    roomStats: stats,
    lightStats: lightSummary,
  };

  return model;
}
