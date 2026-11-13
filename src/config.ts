import type {
  AppearanceSetting,
  ArcusAreas,
  ArcusConfig,
  ArcusConfigInput,
  AtmosphereSetting,
  ChapterKey,
  ChaptersConfig,
  DensitySetting,
  EconomyConfig,
  LanguageSetting,
  NetworkConfig,
  OpeningOverrideConfig,
  PrayersConfig,
  PriceConfig,
  QuickActionConfig,
  RoomOverrideConfig,
  RoomsConfig,
  SecurityConfig,
  SolarConfig,
  VentilationConfig,
  WaterConfig,
} from "./types";

/**
 * The normalized default config. `normalizeConfig` never returns this object
 * itself, so consumers can safely treat their config as their own copy.
 */
export const DEFAULT_CONFIG: ArcusConfig = {
  type: "custom:arcus-card",
  title: "HJEM",
  subtitle: "ARCUS",
  language: "auto",
  appearance: "auto",
  atmosphere: "auto",
  density: "comfortable",
  areas: { include: [], exclude: [], order: [] },
  quick_actions: [],
  rooms: {},
  chapters: {},
  show_weather_forecast: true,
};

const LANGUAGE_SETTINGS = ["auto", "da", "en"] as const;
const APPEARANCE_SETTINGS = ["auto", "dark", "light"] as const;
const ATMOSPHERE_SETTINGS = ["auto", "night", "dawn", "day", "dusk"] as const;
const DENSITY_SETTINGS = ["comfortable", "compact"] as const;

const CHAPTER_KEYS: readonly ChapterKey[] = [
  "energi",
  "sol",
  "vand",
  "sikkerhed",
  "ventilation",
  "teknik",
  "oekonomi",
  "lys",
  "varme",
  "alarmer",
];

const PRICE_KEYS = [
  "current",
  "sell",
  "forecast",
  "spot",
  "lowest",
  "highest",
  "next",
  "previous",
  "tomorrow",
] as const;

const SOLAR_KEYS = [
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
  "inverterModel",
  "dataloggerVersion",
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
  "installedAt",
  "paybackPercent",
  "heliosPath",
] as const;

const PRAYERS_KEYS = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "sunrise",
] as const;
const WATER_KEYS = [
  "state",
  "flow",
  "day",
  "month",
  "year",
  "total",
  "cost",
  "salt",
  "saltDays",
  "capacity",
  "holiday",
] as const;
const NETWORK_KEYS = [
  "router",
  "routerState",
  "google",
  "cloudflare",
  "packetLoss",
  "packetLoss7d",
  "jitter",
  "wifiSignal",
  "uptime",
  "temperature",
  "frequency",
  "inverterModel",
  "dataloggerVersion",
] as const;
const ECONOMY_KEYS = ["bond", "change", "yield", "duration"] as const;
const VENTILATION_KEYS = [
  "temperature",
  "humidity",
  "step",
  "filter",
  "filterAlarm",
  "climate",
  "outdoor",
  "inlet",
  "exhaust",
  "outlet",
  "efficiency",
  "daysSinceFilter",
  "daysToFilter",
  "inletFan",
  "exhaustFan",
  "aggregateType",
  "operationMode",
  "software",
  "userFunction",
  "userFunction2",
  "userTime",
  "userSpeed",
  "resetButton",
] as const;

const ROOM_ENTITY_KEYS = [
  "temp",
  "humidity",
  "co2",
  "pm25",
  "climate",
  "media",
  "leak",
  "battery",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Arcus: ${message}`);
}

function readString(value: unknown, field: string, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") fail(`${field} must be a string.`);
  return value;
}

function readBoolean(
  value: unknown,
  field: string,
  fallback: boolean,
): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") fail(`${field} must be true or false.`);
  return value;
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") fail(`${field} must be a string.`);
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(
      `${field} must be one of ${allowed.map((item) => `"${item}"`).join(", ")}.`,
    );
  }
  return value as T;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    fail(`${field} must be an array of strings.`);
  }
  const out: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      fail(`${field}[${index}] must be a non-empty string.`);
    }
    const trimmed = item.trim();
    if (!out.includes(trimmed)) out.push(trimmed);
  });
  return out;
}

function readEntityList(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const single = readOptionalString(value, field);
    return single ? [single] : [];
  }
  return readStringArray(value, field);
}

function normalizeAreas(value: unknown): ArcusAreas {
  if (value === undefined || value === null) {
    return { include: [], exclude: [], order: [] };
  }
  if (Array.isArray(value)) {
    return {
      include: readStringArray(value, "areas"),
      exclude: [],
      order: [],
    };
  }
  if (!isRecord(value)) {
    fail(
      "areas must be an array of area IDs or an object with include, exclude, and order.",
    );
  }
  return {
    include: readStringArray(value.include ?? [], "areas.include"),
    exclude: readStringArray(value.exclude ?? [], "areas.exclude"),
    order: readStringArray(value.order ?? [], "areas.order"),
  };
}

function normalizeStringSection<T extends object>(
  value: unknown,
  field: string,
  keys: readonly string[],
): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) fail(`${field} must be an object.`);
  const out: Record<string, string> = {};
  for (const key of keys) {
    const item = readOptionalString(value[key], `${field}.${key}`);
    if (item !== undefined) out[key] = item;
  }
  return Object.keys(out).length ? (out as unknown as T) : undefined;
}

function normalizePrice(value: unknown): PriceConfig | undefined {
  return normalizeStringSection<PriceConfig>(value, "price", PRICE_KEYS);
}

function normalizeSolar(value: unknown): SolarConfig | undefined {
  return normalizeStringSection<SolarConfig>(value, "solar", SOLAR_KEYS);
}

function normalizePrayers(value: unknown): PrayersConfig | undefined {
  return normalizeStringSection<PrayersConfig>(value, "prayers", PRAYERS_KEYS);
}

function normalizeWater(value: unknown): WaterConfig | undefined {
  return normalizeStringSection<WaterConfig>(value, "water", WATER_KEYS);
}

function normalizeNetwork(value: unknown): NetworkConfig | undefined {
  return normalizeStringSection<NetworkConfig>(value, "network", NETWORK_KEYS);
}

function normalizeEconomy(value: unknown): EconomyConfig | undefined {
  return normalizeStringSection<EconomyConfig>(value, "economy", ECONOMY_KEYS);
}

function normalizeVentilation(value: unknown): VentilationConfig | undefined {
  return normalizeStringSection<VentilationConfig>(
    value,
    "ventilation",
    VENTILATION_KEYS,
  );
}

function normalizeSecurity(value: unknown): SecurityConfig | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) fail("security must be an object.");
  const out: SecurityConfig = {};
  const windowAlert = readOptionalString(
    value.windowAlert,
    "security.windowAlert",
  );
  const windows = readOptionalString(value.windows, "security.windows");
  if (windowAlert !== undefined) out.windowAlert = windowAlert;
  if (windows !== undefined) out.windows = windows;
  if (value.leaks !== undefined && value.leaks !== null) {
    out.leaks = readStringArray(value.leaks, "security.leaks");
  }
  if (value.batteries !== undefined && value.batteries !== null) {
    out.batteries = readStringArray(value.batteries, "security.batteries");
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeQuickActions(value: unknown): QuickActionConfig[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("quick_actions must be an array.");
  return value.map((item, index) => {
    const field = `quick_actions[${index}]`;
    if (!isRecord(item)) fail(`${field} must be an object.`);
    if (typeof item.label !== "string" || !item.label.trim()) {
      fail(`${field}.label is required.`);
    }
    if (!isRecord(item.action)) {
      fail(`${field}.action is required and must be an action object.`);
    }
    const action = item.action;
    const out: QuickActionConfig = {
      label: item.label.trim(),
      action: { ...action },
    };
    const icon = readOptionalString(item.icon, `${field}.icon`);
    const entity = readOptionalString(item.entity, `${field}.entity`);
    if (icon !== undefined) out.icon = icon;
    if (entity !== undefined) out.entity = entity;
    return out;
  });
}

function normalizeOpenings(
  value: unknown,
  field: string,
): OpeningOverrideConfig[] {
  if (!Array.isArray(value)) {
    fail(`${field} must be an array of entity IDs or opening objects.`);
  }
  return value.map((item, index) => {
    if (typeof item === "string") {
      const id = readOptionalString(item, `${field}[${index}]`);
      if (!id) fail(`${field}[${index}] must be a non-empty entity ID.`);
      return { id };
    }
    if (!isRecord(item)) {
      fail(`${field}[${index}] must be an entity ID or an opening object.`);
    }
    const id = readOptionalString(item.id, `${field}[${index}].id`);
    if (!id) fail(`${field}[${index}].id is required.`);
    const opening: OpeningOverrideConfig = { id };
    const name = readOptionalString(item.name, `${field}[${index}].name`);
    const kind = readOptionalString(item.kind, `${field}[${index}].kind`);
    if (name !== undefined) opening.name = name;
    if (kind !== undefined) opening.kind = kind;
    return opening;
  });
}

function normalizeRooms(value: unknown): RoomsConfig {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) fail("rooms must be an object keyed by area ID.");
  const out: RoomsConfig = {};
  for (const [areaId, rawRoom] of Object.entries(value)) {
    if (!areaId.trim()) fail("rooms keys must be area IDs.");
    const field = `rooms.${areaId}`;
    if (!isRecord(rawRoom)) fail(`${field} must be an object.`);
    const room: RoomOverrideConfig = {};
    for (const key of ROOM_ENTITY_KEYS) {
      const entity = readOptionalString(rawRoom[key], `${field}.${key}`);
      if (entity !== undefined) room[key] = entity;
    }
    const name = readOptionalString(rawRoom.name, `${field}.name`);
    const tint = readOptionalString(rawRoom.tint, `${field}.tint`);
    if (name !== undefined) room.name = name;
    if (tint !== undefined) room.tint = tint;
    if (rawRoom.lights !== undefined && rawRoom.lights !== null) {
      room.lights = readEntityList(rawRoom.lights, `${field}.lights`) ?? [];
    }
    if (rawRoom.openings !== undefined && rawRoom.openings !== null) {
      room.openings = normalizeOpenings(rawRoom.openings, `${field}.openings`);
    }
    out[areaId] = room;
  }
  return out;
}

function normalizeChapters(value: unknown): ChaptersConfig {
  if (value === undefined || value === null) return {};
  if (!isRecord(value))
    fail("chapters must be an object keyed by chapter name.");
  const out: ChaptersConfig = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (!CHAPTER_KEYS.includes(key as ChapterKey)) {
      fail(
        `chapters.${key} is not a known chapter (${CHAPTER_KEYS.join(", ")}).`,
      );
    }
    if (typeof enabled !== "boolean") {
      fail(`chapters.${key} must be true or false.`);
    }
    out[key as ChapterKey] = enabled;
  }
  return out;
}

/**
 * Validate and normalize a YAML/card config.
 *
 * Throws an `Error` whose message starts with `Arcus:` when a field has the
 * wrong shape. Unknown top-level keys are ignored so the config can grow
 * without breaking older builds.
 */
export function normalizeConfig(input: unknown): ArcusConfig {
  const raw: unknown = input === undefined || input === null ? {} : input;
  if (!isRecord(raw)) fail("configuration must be an object.");

  const config: ArcusConfig = {
    type: readString(raw.type, "type", DEFAULT_CONFIG.type),
    title: readString(raw.title, "title", DEFAULT_CONFIG.title),
    subtitle: readString(raw.subtitle, "subtitle", DEFAULT_CONFIG.subtitle),
    language: readEnum<LanguageSetting>(
      raw.language,
      "language",
      LANGUAGE_SETTINGS,
      DEFAULT_CONFIG.language,
    ),
    appearance: readEnum<AppearanceSetting>(
      raw.appearance,
      "appearance",
      APPEARANCE_SETTINGS,
      DEFAULT_CONFIG.appearance,
    ),
    atmosphere: readEnum<AtmosphereSetting>(
      raw.atmosphere,
      "atmosphere",
      ATMOSPHERE_SETTINGS,
      DEFAULT_CONFIG.atmosphere,
    ),
    density: readEnum<DensitySetting>(
      raw.density,
      "density",
      DENSITY_SETTINGS,
      DEFAULT_CONFIG.density,
    ),
    areas: normalizeAreas(raw.areas),
    quick_actions: normalizeQuickActions(raw.quick_actions),
    rooms: normalizeRooms(raw.rooms),
    chapters: normalizeChapters(raw.chapters),
    show_weather_forecast: readBoolean(
      raw.show_weather_forecast,
      "show_weather_forecast",
      DEFAULT_CONFIG.show_weather_forecast,
    ),
  };

  const optional: Array<
    [
      keyof Pick<
        ArcusConfig,
        | "weather"
        | "price"
        | "solar"
        | "prayers"
        | "water"
        | "network"
        | "economy"
        | "ventilation"
        | "security"
      >,
      unknown,
      (value: unknown) => unknown,
    ]
  > = [
    ["weather", raw.weather, (value) => readOptionalString(value, "weather")],
    ["price", raw.price, normalizePrice],
    ["solar", raw.solar, normalizeSolar],
    ["prayers", raw.prayers, normalizePrayers],
    ["water", raw.water, normalizeWater],
    ["network", raw.network, normalizeNetwork],
    ["economy", raw.economy, normalizeEconomy],
    ["ventilation", raw.ventilation, normalizeVentilation],
    ["security", raw.security, normalizeSecurity],
  ];

  for (const [key, value, normalize] of optional) {
    const normalized = normalize(value);
    if (normalized !== undefined) {
      (config as unknown as Record<string, unknown>)[key] = normalized;
    }
  }

  return config;
}

/** Assert that a value is a structurally valid Arcus config. */
export function validateConfig(
  input: unknown,
): asserts input is ArcusConfigInput {
  normalizeConfig(input);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) out[key] = stableValue(value[key]);
    }
    return out;
  }
  return value;
}

/**
 * A deterministic signature of the normalized config. Used by the card to
 * decide whether a `hass` update requires a full rebuild.
 */
export function configSignature(config: ArcusConfig): string {
  return JSON.stringify(stableValue(config));
}
