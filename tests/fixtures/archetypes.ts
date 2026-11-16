/**
 * Archetype homes for the configurability suite.
 *
 * These fixtures intentionally look nothing like `tests/fixtures/home.ts`: an
 * urban apartment with no solar, a two-floor US home with a garage and an EV,
 * and a bare-minimum home that relies entirely on auto-discovery.
 */
import { normalizeConfig } from "../../src/config";
import type {
  ArcusConfig,
  ArcusHass,
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  HassConfig,
  HassEntity,
} from "../../src/types";

const entity = (
  value: string,
  attributes: Record<string, unknown> = {},
): HassEntity => {
  return {
    state: value,
    attributes,
    last_changed: "2026-11-13T00:00:00+00:00",
    last_updated: "2026-11-13T00:00:00+00:00",
  };
};

const area = (
  areaId: string,
  name: string,
  extra: Partial<AreaRegistryEntry> = {},
): AreaRegistryEntry => {
  return { area_id: areaId, name, ...extra };
};

const device = (
  id: string,
  areaId: string,
  name: string,
): DeviceRegistryEntry => {
  return { id, area_id: areaId, name, name_by_user: name };
};

const registryEntity = (
  entityId: string,
  areaId?: string,
  deviceId?: string,
): EntityRegistryEntry => {
  return {
    entity_id: entityId,
    area_id: deviceId || !areaId ? null : areaId,
    device_id: deviceId ?? null,
  };
};

interface HassParts {
  states: Record<string, HassEntity>;
  areas: AreaRegistryEntry[];
  devices?: DeviceRegistryEntry[];
  entities?: EntityRegistryEntry[];
  config?: HassConfig;
  language?: string;
  floors?: Record<string, any>;
}

const buildHass = (parts: HassParts): ArcusHass => {
  const areas: Record<string, AreaRegistryEntry> = {};
  for (const entry of parts.areas) areas[entry.area_id] = entry;
  const devices: Record<string, DeviceRegistryEntry> = {};
  for (const entry of parts.devices ?? []) devices[entry.id] = entry;
  const entities: Record<string, EntityRegistryEntry> = {};
  for (const entry of parts.entities ?? []) {
    entities[entry.entity_id] = entry;
  }
  return {
    states: parts.states,
    areas,
    devices,
    entities,
    floors: parts.floors ?? {},
    config: parts.config,
    language: parts.language ?? "en",
    themes: { darkMode: true },
    callWS: async () => ({}) as never,
    callApi: async () => ({}) as never,
    callService: async () => undefined,
  };
};

/* ------------------------------------------------------------------ */
/* 1. Urban apartment: EUR, radiators, no solar, no softener           */
/* ------------------------------------------------------------------ */

export const APARTMENT_ROOMS = ["living_room", "bedroom", "kitchen"] as const;

export const makeApartmentHass = (): ArcusHass => {
  const states: Record<string, HassEntity> = {
    "sun.sun": entity("below_horizon", {
      elevation: -12,
      next_rising: "2026-11-14T07:41:00+01:00",
      next_setting: "2026-11-13T16:03:00+01:00",
      next_noon: "2026-11-14T11:52:00+01:00",
    }),
    "person.alex": entity("home", { friendly_name: "Alex" }),
    "weather.home": entity("clear", {
      temperature: 9.4,
      humidity: 71,
      pressure: 1014,
      wind_speed: 3.1,
      forecast: [{ datetime: "2026-11-14T00:00:00", temperature: 9 }],
    }),
    "sensor.electricity_total_price": entity("0.284", {
      friendly_name: "Electricity total price",
      unit_of_measurement: "EUR/kWh",
    }),
    "sensor.electricity_forecast": entity("0.284", {
      friendly_name: "Electricity forecast",
      raw_today: [
        { hour: 0, price: 0.24 },
        { hour: 1, price: 0.26 },
      ],
    }),
    "climate.living_room": entity("heat", {
      current_temperature: 21.2,
      temperature: 21.5,
      hvac_modes: ["off", "heat"],
    }),
    "climate.bedroom": entity("off", {
      current_temperature: 18.4,
      temperature: 18,
      hvac_modes: ["off", "heat"],
    }),
    "sensor.living_room_temperature": entity("21.3", {
      device_class: "temperature",
      unit_of_measurement: "°C",
    }),
    "sensor.bedroom_temperature": entity("18.5", {
      device_class: "temperature",
      unit_of_measurement: "°C",
    }),
    "sensor.kitchen_temperature": entity("20.8", {
      device_class: "temperature",
      unit_of_measurement: "°C",
    }),
    "sensor.kitchen_co2": entity("640", {
      device_class: "carbon_dioxide",
      unit_of_measurement: "ppm",
    }),
    "light.living_room": entity("on", { friendly_name: "Living room" }),
    "light.kitchen": entity("off", { friendly_name: "Kitchen" }),
    "binary_sensor.kitchen_door": entity("off", {
      device_class: "door",
      friendly_name: "Kitchen door",
    }),
    "binary_sensor.living_room_window": entity("off", {
      device_class: "window",
      friendly_name: "Living room window",
    }),
    "binary_sensor.kitchen_water_leak": entity("off", {
      device_class: "moisture",
      friendly_name: "Kitchen leak",
    }),
    "sensor.kitchen_door_battery": entity("84", {
      device_class: "battery",
      unit_of_measurement: "%",
    }),
  };

  return buildHass({
    states,
    areas: [
      area("living_room", "Living room", { icon: "mdi:sofa" }),
      area("bedroom", "Bedroom", { icon: "mdi:bed" }),
      area("kitchen", "Kitchen", { icon: "mdi:countertop" }),
    ],
    devices: [device("dev-door", "kitchen", "Kitchen door")],
    entities: [
      registryEntity("climate.living_room", "living_room"),
      registryEntity("climate.bedroom", "bedroom"),
      registryEntity("sensor.living_room_temperature", "living_room"),
      registryEntity("sensor.bedroom_temperature", "bedroom"),
      registryEntity("sensor.kitchen_temperature", "kitchen"),
      registryEntity("sensor.kitchen_co2", "kitchen"),
      registryEntity("light.living_room", "living_room"),
      registryEntity("light.kitchen", "kitchen"),
      registryEntity("binary_sensor.kitchen_door", "kitchen", "dev-door"),
      registryEntity("binary_sensor.living_room_window", "living_room"),
      registryEntity("binary_sensor.kitchen_water_leak", "kitchen"),
      registryEntity("sensor.kitchen_door_battery", "kitchen", "dev-door"),
      registryEntity("sensor.electricity_total_price"),
      registryEntity("sensor.electricity_forecast"),
    ],
    config: {
      currency: "EUR",
      unit_system: { temperature: "°C" },
    },
    language: "en",
  });
};

export const makeApartmentConfig = (): ArcusConfig => {
  return normalizeConfig({
    type: "custom:arcus-card",
    title: "Apartment",
    subtitle: "Arc",
    language: "en",
  });
};

/* ------------------------------------------------------------------ */
/* 2. Suburban two-floor home: USD/°F, solar without battery, garage    */
/* ------------------------------------------------------------------ */

export const SUBURBAN_ROOMS = [
  "living_room",
  "kitchen",
  "office",
  "garage",
] as const;

export const makeSuburbanHass = (): ArcusHass => {
  const states: Record<string, HassEntity> = {
    "sun.sun": entity("above_horizon", {
      elevation: 21,
      next_rising: "2026-11-14T06:52:00-05:00",
      next_setting: "2026-11-13T16:47:00-05:00",
    }),
    "person.jordan": entity("not_home", { friendly_name: "Jordan" }),
    "person.sam": entity("home", { friendly_name: "Sam" }),
    "weather.forecast_home": entity("cloudy", {
      temperature: 48.2,
      humidity: 62,
    }),
    "sensor.electricity_total_price": entity("0.19", {
      unit_of_measurement: "USD/kWh",
    }),
    "sensor.electricity_forecast": entity("0.19", {
      raw_today: [{ hour: 0, price: 0.18 }],
    }),
    "climate.living_room": entity("heat_cool", {
      current_temperature: 69,
      temperature: 70,
      hvac_modes: ["off", "heat", "cool", "heat_cool"],
    }),
    "sensor.living_room_temperature": entity("69.4", {
      device_class: "temperature",
      unit_of_measurement: "°F",
    }),
    "light.living_room": entity("on"),
    "light.kitchen": entity("on"),
    "cover.garage_door": entity("closed", {
      friendly_name: "Garage door",
      device_class: "garage",
    }),
    "lock.garage_side_door": entity("locked", {
      friendly_name: "Garage side door",
    }),
    "lock.front_door": entity("locked", { friendly_name: "Front door" }),
    "alarm_control_panel.home_alarm": entity("disarmed", {
      friendly_name: "Home alarm",
    }),
    "sensor.solar_energy_production_today": entity("22.4", {
      device_class: "energy",
      unit_of_measurement: "kWh",
    }),
    "sensor.solar_energy_production_tomorrow": entity("18.1", {
      device_class: "energy",
      unit_of_measurement: "kWh",
    }),
    "sensor.inverter_pv1_power": entity("2100", {
      device_class: "power",
      unit_of_measurement: "W",
    }),
    "sensor.inverter_pv2_power": entity("1950", {
      device_class: "power",
      unit_of_measurement: "W",
    }),
    "sensor.water_total": entity("88.4", {
      device_class: "water",
      unit_of_measurement: "gal",
    }),
    "sensor.water_day": entity("34", {
      friendly_name: "Water today",
    }),
    "sensor.water_month": entity("920", {
      friendly_name: "Water month",
    }),
    "sensor.ev_power": entity("7200", {
      device_class: "power",
      unit_of_measurement: "W",
    }),
    "sensor.ev_soc": entity("64", {
      device_class: "battery",
      unit_of_measurement: "%",
    }),
    "sensor.freezer_power": entity("45", {
      device_class: "power",
      unit_of_measurement: "W",
    }),
  };

  return buildHass({
    states,
    areas: [
      area("living_room", "Living room", {
        icon: "mdi:sofa",
        floor_id: "ground_floor",
      }),
      area("kitchen", "Kitchen", {
        icon: "mdi:countertop",
        floor_id: "ground_floor",
      }),
      area("office", "Office", {
        icon: "mdi:desk",
        floor_id: "first_floor",
      }),
      area("garage", "Garage", {
        icon: "mdi:garage",
        floor_id: "ground_floor",
      }),
    ],
    floors: {
      ground_floor: {
        floor_id: "ground_floor",
        name: "Ground floor",
        level: 0,
      },
      first_floor: { floor_id: "first_floor", name: "First floor", level: 1 },
    },
    devices: [
      device("dev-garage-door", "garage", "Garage door"),
      device("dev-garage-lock", "garage", "Garage side door"),
    ],
    entities: [
      registryEntity("climate.living_room", "living_room"),
      registryEntity("sensor.living_room_temperature", "living_room"),
      registryEntity("light.living_room", "living_room"),
      registryEntity("light.kitchen", "kitchen"),
      registryEntity("cover.garage_door", "garage", "dev-garage-door"),
      registryEntity("lock.garage_side_door", "garage", "dev-garage-lock"),
      registryEntity("lock.front_door"),
      registryEntity("alarm_control_panel.home_alarm"),
      registryEntity("sensor.solar_energy_production_today"),
      registryEntity("sensor.solar_energy_production_tomorrow"),
      registryEntity("sensor.inverter_pv1_power"),
      registryEntity("sensor.inverter_pv2_power"),
      registryEntity("sensor.water_total"),
      registryEntity("sensor.water_day"),
      registryEntity("sensor.water_month"),
      registryEntity("sensor.ev_power"),
      registryEntity("sensor.ev_soc"),
      registryEntity("sensor.freezer_power"),
    ],
    config: {
      currency: "USD",
      unit_system: { temperature: "°F" },
    },
    language: "en",
  });
};

export const makeSuburbanConfig = (): ArcusConfig => {
  return normalizeConfig({
    type: "custom:arcus-card",
    language: "en",
    group_by_floor: true,
    units: { currency: "$", price_unit: "$/kWh", temperature: "°F" },
    energy: {
      standby: "sensor.freezer_power",
      ev: {
        name: "Rivian",
        power: "sensor.ev_power",
        soc: "sensor.ev_soc",
      },
      appliances: [
        { name: "Freezer", entity: "sensor.freezer_power", icon: "snow" },
      ],
    },
    rooms: {
      garage: { kind: "outdoor", wide: true },
    },
  });
};

/* ------------------------------------------------------------------ */
/* 3. Minimal home: no overrides at all, auto-discovery only            */
/* ------------------------------------------------------------------ */

export const makeMinimalHass = (): ArcusHass => {
  const states: Record<string, HassEntity> = {
    "sun.sun": entity("above_horizon", { elevation: 33 }),
    "weather.home": entity("sunny", { temperature: 23.1 }),
    "sensor.studio_temperature": entity("22.8", {
      device_class: "temperature",
      unit_of_measurement: "°C",
    }),
    "sensor.studio_humidity": entity("44", {
      device_class: "humidity",
      unit_of_measurement: "%",
    }),
    "climate.studio": entity("heat", {
      current_temperature: 22.8,
      temperature: 23,
      hvac_modes: ["off", "heat"],
    }),
    "light.studio": entity("on"),
    "light.balcony": entity("off"),
    "binary_sensor.studio_moisture": entity("off", {
      device_class: "moisture",
    }),
  };

  return buildHass({
    states,
    areas: [area("studio", "Studio"), area("balcony", "Balcony")],
    entities: [
      registryEntity("sensor.studio_temperature", "studio"),
      registryEntity("sensor.studio_humidity", "studio"),
      registryEntity("climate.studio", "studio"),
      registryEntity("light.studio", "studio"),
      registryEntity("light.balcony", "balcony"),
      registryEntity("binary_sensor.studio_moisture", "studio"),
    ],
    config: {
      currency: "DKK",
      unit_system: { temperature: "°C" },
    },
    language: "da",
  });
};

export const makeMinimalConfig = (): ArcusConfig => {
  return normalizeConfig({ type: "custom:arcus-card" });
};
