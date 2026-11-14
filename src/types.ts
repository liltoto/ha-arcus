/**
 * Shared structural types for Arcus.
 *
 * These types intentionally describe only the parts of Home Assistant that
 * Arcus relies on. They are structural so the real `hass` object, the dev mock,
 * and test fixtures can all be passed without casts.
 *
 * Room sensor fields are `EntityRef`s, not raw entity ID strings. Discovery
 * resolves registries and states once; the views then read the ref. The legacy
 * prototype used bare IDs because they were hardcoded, but the dynamic model
 * has to carry the resolved name/state as well.
 */

/* ------------------------------------------------------------------ */
/* Home Assistant registries and services                              */
/* ------------------------------------------------------------------ */

export interface HassEntity {
  entity_id?: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context?: Record<string, any>;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  icon?: string | null;
  floor_id?: string | null;
  [key: string]: any;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id?: string | null;
  name?: string | null;
  name_by_user?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  [key: string]: any;
}

export interface EntityRegistryEntry {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
  platform?: string | null;
  entity_category?: string | null;
  hidden_by?: string | null;
  disabled_by?: string | null;
  name?: string | null;
  original_name?: string | null;
  unique_id?: string | null;
  [key: string]: any;
}

/**
 * The subset of the Home Assistant frontend object that Arcus uses.
 *
 * `callWS`/`callApi` are deliberately permissive: Home Assistant's own types
 * are generic and evolve, while the plugin only needs the resolved value.
 */
export interface ArcusHass {
  states: Record<string, HassEntity>;
  areas: Record<string, AreaRegistryEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  entities: Record<string, EntityRegistryEntry>;
  themes?: { darkMode?: boolean };
  language?: string;
  user?: { name?: string };
  callWS<T = any>(message: { type: string; [key: string]: any }): Promise<T>;
  callApi<T = any>(
    method: string,
    path: string,
    parameters?: unknown,
  ): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, any>,
    target?: Record<string, any>,
  ): Promise<unknown>;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export type Language = "da" | "en";
export type LanguageSetting = "auto" | Language;
export type AppearanceSetting = "auto" | "dark" | "light";
export type AtmosphereSetting = "auto" | "night" | "dawn" | "day" | "dusk";
export type DensitySetting = "comfortable" | "compact";

export type EntityId = string;

/** A Home Assistant action config, used by quick actions and the editor. */
export interface ActionConfig {
  action?: string;
  service?: string;
  perform_action?: string;
  target?: {
    entity_id?: string | string[];
    area_id?: string | string[];
    device_id?: string | string[];
    [key: string]: any;
  };
  data?: Record<string, any>;
  entity_id?: string | string[];
  navigation_path?: string;
  url_path?: string;
  [key: string]: any;
}

export interface QuickActionConfig {
  label: string;
  icon?: string;
  action: ActionConfig;
  entity?: string;
}

export interface ArcusAreas {
  include: string[];
  exclude: string[];
  order: string[];
}

export interface ArcusAreasInput {
  include?: string[];
  exclude?: string[];
  order?: string[];
}

export interface PriceConfig {
  current?: string;
  sell?: string;
  forecast?: string;
  spot?: string;
  lowest?: string;
  highest?: string;
  next?: string;
  previous?: string;
  tomorrow?: string;
}

/**
 * Entity mapping for the solar layers. The first group is the public,
 * documented API. The rest fills the detailed legacy sheets.
 */
export interface SolarConfig {
  power?: string;
  today?: string;
  forecastToday?: string;
  forecastTomorrow?: string;
  batterySoc?: string;
  load?: string;
  grid?: string;
  batteryPower?: string;
  pv3?: string;
  pv4?: string;
  totalProduction?: string;
  month?: string;
  year?: string;

  batteryTemperature?: string;
  batteryVoltage?: string;
  batteryCurrent?: string;
  batteryCharge?: string;
  batteryDischarge?: string;
  batteryMinSoc?: string;
  batteryMaxSoc?: string;

  inverterTemperature?: string;
  inverterFrequency?: string;
  inverterModel?: string;
  dataloggerVersion?: string;
  wifiSignal?: string;
  uptime?: string;

  gridL1?: string;
  gridL2?: string;
  gridL3?: string;
  pv3Voltage?: string;
  pv3Current?: string;
  pv4Voltage?: string;
  pv4Current?: string;

  forecastRemaining?: string;
  forecastNow?: string;
  forecastCurrentHour?: string;
  forecastNextHour?: string;
  forecastNext24h?: string;
  forecastD2?: string;
  forecastD3?: string;

  savingsTotal?: string;
  savingsSolar?: string;
  savingsBattery?: string;
  savingsRate?: string;
  investmentSolar?: string;
  investmentBattery?: string;
  installedAt?: string;
  paybackPercent?: string;

  /** Optional path to an external Helios 3D dashboard. */
  heliosPath?: string;
}

export interface PrayersConfig {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
  sunrise?: string;
}

export interface WaterConfig {
  state?: string;
  flow?: string;
  day?: string;
  month?: string;
  year?: string;
  total?: string;
  cost?: string;
  salt?: string;
  saltDays?: string;
  capacity?: string;
  holiday?: string;
}

export interface NetworkConfig {
  router?: string;
  routerState?: string;
  google?: string;
  cloudflare?: string;
  packetLoss?: string;
  packetLoss7d?: string;
  jitter?: string;
  wifiSignal?: string;
  uptime?: string;
  temperature?: string;
  frequency?: string;
  inverterModel?: string;
  dataloggerVersion?: string;
}

export interface EconomyConfig {
  bond?: string;
  change?: string;
  yield?: string;
  duration?: string;
}

export interface VentilationConfig {
  temperature?: string;
  humidity?: string;
  step?: string;
  filter?: string;
  filterAlarm?: string;
  climate?: string;
  outdoor?: string;
  inlet?: string;
  exhaust?: string;
  outlet?: string;
  efficiency?: string;
  daysSinceFilter?: string;
  daysToFilter?: string;
  inletFan?: string;
  exhaustFan?: string;
  aggregateType?: string;
  operationMode?: string;
  software?: string;
  userFunction?: string;
  userFunction2?: string;
  userTime?: string;
  userSpeed?: string;
  resetButton?: string;
}

export interface SecurityConfig {
  windowAlert?: string;
  windows?: string;
  leaks?: string[];
  batteries?: string[];
}

export interface OpeningOverrideConfig {
  id: string;
  name?: string;
  kind?: string;
}

export interface RoomOverrideConfig {
  temp?: string;
  humidity?: string;
  co2?: string;
  pm25?: string;
  lights?: string[];
  openings?: OpeningOverrideConfig[];
  climate?: string;
  media?: string;
  leak?: string;
  battery?: string;
  name?: string;
  tint?: string;
}

/** YAML shape for a room override: a single light/opening may be a string. */
export interface RoomOverrideInput extends Omit<
  RoomOverrideConfig,
  "lights" | "openings"
> {
  lights?: string | string[];
  openings?: Array<string | OpeningOverrideConfig>;
}

export type RoomsConfig = Record<string, RoomOverrideConfig>;
export type RoomsInput = Record<string, RoomOverrideInput>;

export type ChapterKey =
  | "energi"
  | "sol"
  | "vand"
  | "sikkerhed"
  | "ventilation"
  | "teknik"
  | "oekonomi"
  | "lys"
  | "varme"
  | "alarmer";

export type ChaptersConfig = Partial<Record<ChapterKey, boolean>>;

export interface ArcusConfigInput {
  type?: string;
  title?: string;
  subtitle?: string;
  language?: LanguageSetting;
  appearance?: AppearanceSetting;
  atmosphere?: AtmosphereSetting;
  density?: DensitySetting;
  areas?: string[] | ArcusAreasInput;
  weather?: string;
  price?: PriceConfig;
  solar?: SolarConfig;
  prayers?: PrayersConfig;
  water?: WaterConfig;
  network?: NetworkConfig;
  economy?: EconomyConfig;
  ventilation?: VentilationConfig;
  security?: SecurityConfig;
  quick_actions?: QuickActionConfig[];
  rooms?: RoomsInput;
  chapters?: ChaptersConfig;
  show_weather_forecast?: boolean;
}

export interface ArcusConfig {
  type: string;
  title: string;
  subtitle: string;
  language: LanguageSetting;
  appearance: AppearanceSetting;
  atmosphere: AtmosphereSetting;
  density: DensitySetting;
  areas: ArcusAreas;
  weather?: string;
  price?: PriceConfig;
  solar?: SolarConfig;
  prayers?: PrayersConfig;
  water?: WaterConfig;
  network?: NetworkConfig;
  economy?: EconomyConfig;
  ventilation?: VentilationConfig;
  security?: SecurityConfig;
  quick_actions: QuickActionConfig[];
  rooms: RoomsConfig;
  chapters: ChaptersConfig;
  show_weather_forecast: boolean;
}

/* ------------------------------------------------------------------ */
/* Resolved model                                                      */
/* ------------------------------------------------------------------ */

export interface EntityRef {
  entityId: string;
  state?: string;
  name?: string;
  unit?: string;
  deviceClass?: string;
  attributes?: Record<string, any>;
}

export interface LightGroupModel {
  entityId: string;
  name: string;
  icon: string;
  members: string[];
  extra: string[];
  areaId: string;
}

export interface OpeningModel {
  id: string;
  name: string;
  kind: string;
  room?: string;
}

/**
 * A discovered room. `id` is kept for the legacy view/routes and is always the
 * same value as `areaId` (the Home Assistant area registry ID).
 */
export interface RoomModel {
  id: string;
  areaId: string;
  name: string;
  icon: string;
  wide?: boolean;
  tint: string;
  temp?: EntityRef | null;
  tempFallback?: EntityRef | null;
  humidity?: EntityRef | null;
  co2?: EntityRef | null;
  pm25?: EntityRef | null;
  lights: LightGroupModel[];
  openings: OpeningModel[];
  climate?: EntityRef | null;
  media?: EntityRef | null;
  leak?: EntityRef | null;
  fan?: EntityRef | null;
  filter?: EntityRef | null;
  filterAlarm?: EntityRef | null;
  battery?: EntityRef | null;
  motion?: EntityRef | null;
  illuminance?: EntityRef | null;
  plug?: EntityRef | null;
}

export interface WeatherForecastDay {
  datetime: string;
  condition?: string;
  temperature?: number | null;
  templow?: number | null;
  precipitation?: number | null;
  [key: string]: any;
}

export interface WeatherModel {
  state: string;
  temp?: number | null;
  humidity?: number | null;
  wind?: number | null;
  pressure?: number | null;
  icon?: string;
  text?: string;
  forecast?: WeatherForecastDay[];
  [key: string]: any;
}

export interface SolarPoint {
  t: Date;
  v: number;
}

export interface SolarModel {
  power: number | null;
  today: number | null;
  forecastToday: number | null;
  forecastTomorrow: number | null;
  batterySoc: number | null;
  load: number | null;
  grid: number | null;
  batteryPower: number | null;
  pv3: number | null;
  pv4: number | null;
  totalProduction: number | null;
  month: number | null;
  year: number | null;

  forecastSeries?: SolarPoint[];
  tomorrowSeries?: SolarPoint[];
  forecastRemaining?: number | null;
  forecastNow?: number | null;
  forecastCurrentHour?: number | null;
  forecastNextHour?: number | null;
  forecastNext24h?: number | null;
  forecastD2?: number | null;
  forecastD3?: number | null;

  batteryTemperature?: number | null;
  batteryVoltage?: number | null;
  batteryCurrent?: number | null;
  batteryCharge?: number | null;
  batteryDischarge?: number | null;
  batteryMinSoc?: number | null;
  batteryMaxSoc?: number | null;
  inverterTemperature?: number | null;
  inverterFrequency?: number | null;
  inverterModel?: string | null;
  dataloggerVersion?: string | null;
  wifiSignal?: number | null;
  uptime?: number | null;

  gridL1?: number | null;
  gridL2?: number | null;
  gridL3?: number | null;
  pv3Voltage?: number | null;
  pv3Current?: number | null;
  pv4Voltage?: number | null;
  pv4Current?: number | null;

  savingsTotal?: number | null;
  savingsSolar?: number | null;
  savingsBattery?: number | null;
  savingsRate?: number | null;
  investmentSolar?: number | null;
  investmentBattery?: number | null;
  paybackPercent?: number | null;

  [key: string]: any;
}

export interface PrayerTimeModel {
  id: string;
  name: string;
  time: Date;
  minutes: number;
  entityId?: string;
}

export interface PrayersModel {
  times: PrayerTimeModel[];
  next: PrayerTimeModel | null;
  sunrise?: Date | null;
  [key: string]: any;
}

export interface WaterModel {
  state?: string | null;
  flow?: number | null;
  day?: number | null;
  month?: number | null;
  year?: number | null;
  total?: number | null;
  cost?: number | null;
  salt?: number | null;
  saltDays?: number | null;
  capacity?: number | null;
  holiday?: boolean;
  [key: string]: any;
}

export interface PriceModel {
  values: number[];
  min: number;
  max: number;
  now: number;
  buy?: number | null;
  sell?: number | null;
  spot?: number | null;
  forecast?: number[] | null;
  lowest?: number | null;
  highest?: number | null;
  next?: number | null;
  previous?: number | null;
  tomorrow?: boolean;
  cheapest?: { start: number; end: number; avg: number; sum?: number } | null;
  [key: string]: any;
}

export interface NetworkModel {
  router?: number | null;
  google?: number | null;
  cloudflare?: number | null;
  packetLoss?: number | null;
  packetLoss7d?: number | null;
  jitter?: number | null;
  routerOnline?: boolean;
  wifiSignal?: number | null;
  uptime?: number | null;
  temperature?: number | null;
  frequency?: number | null;
  inverterModel?: string | null;
  dataloggerVersion?: string | null;
  [key: string]: any;
}

/** The tech sheet uses the network readings plus inverter details. */
export interface TechModel extends NetworkModel {}

export interface EconomyModel {
  value?: number | null;
  change?: number | null;
  yield?: number | null;
  duration?: number | null;
  [key: string]: any;
}

export interface VentilationModel {
  temperature?: number | null;
  humidity?: number | null;
  step?: number | null;
  filter?: string | null;
  climateMode?: string | null;
  fanMode?: string | number | null;
  target?: number | null;
  outdoor?: number | null;
  inlet?: number | null;
  exhaust?: number | null;
  outlet?: number | null;
  efficiency?: number | null;
  daysSinceFilter?: number | null;
  daysToFilter?: number | null;
  inletFan?: number | null;
  exhaustFan?: number | null;
  aggregateType?: string | null;
  operationMode?: string | null;
  software?: string | null;
  [key: string]: any;
}

export interface SecurityBatteryModel {
  entityId: string;
  name: string;
  level: number | null;
}

export interface HeatingModel {
  name: string;
  entity: EntityRef;
  opening?: EntityRef | null;
  areaId?: string;
}

export interface HeatingReserveModel {
  name: string;
  entity: EntityRef;
}

export interface SkurModel {
  temp?: EntityRef | null;
  humidity?: EntityRef | null;
}

export interface SystemCardModel {
  id: string;
  name: string;
  icon: string;
  tint: string;
  temp?: EntityRef | null;
  humidity?: EntityRef | null;
  step?: EntityRef | null;
  filter?: EntityRef | null;
  filterAlarm?: EntityRef | null;
  climate?: EntityRef | null;
}

export interface SecurityModel {
  open?: number;
  leak?: boolean;
  openings?: OpeningModel[];
  batteries?: SecurityBatteryModel[];
  windowAlert?: boolean;
  [key: string]: any;
}

export interface AlertModel {
  /** 1 = info, 2 = warning, 3 = critical. */
  sev: 1 | 2 | 3;
  key: string;
  title: string;
  text: string;
  /** Navigation path such as `rum/kokken` or `sikkerhed`. */
  route: string;
}

export interface HomeModel {
  rooms: RoomModel[];
  /** All light groups across the discovered rooms, in room order. */
  lights: LightGroupModel[];
  /** Heating zones discovered from climate entities, in area order. */
  heating: HeatingModel[];
  /** Extra Wavin reserve channels from config. */
  heatingReserve: HeatingReserveModel[];
  /** Ventilation/skur cards shown after the room grid. */
  systemCards: SystemCardModel[];
  skur?: SkurModel | null;
  weather?: WeatherModel;
  price?: PriceModel;
  /** Optional alias of the price/energy section used by the energy sheet. */
  energy?: PriceModel;
  solar?: SolarModel;
  prayers?: PrayersModel;
  water?: WaterModel;
  security?: SecurityModel;
  tech?: TechModel;
  economy?: EconomyModel;
  ventilation?: VentilationModel;
  alerts: AlertModel[];
  chapters: Record<ChapterKey, boolean>;
  [key: string]: any;
}

/* ------------------------------------------------------------------ */
/* Routes and translation                                              */
/* ------------------------------------------------------------------ */

export type SolarTab =
  "overblik" | "produktion" | "batteri" | "prognose" | "afkast";

export type Translator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;
