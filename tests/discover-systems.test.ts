import { describe, expect, test } from "vitest";
import { normalizeConfig } from "../src/config";
import { discoverSystems } from "../src/model/discover-systems";
import type {
  ArcusConfig,
  ArcusHass,
  HassEntity,
} from "../src/types";

function state(
  value: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  return {
    entity_id: undefined,
    state: value,
    attributes,
    last_changed: "2026-11-13T00:00:00+00:00",
    last_updated: "2026-11-13T00:00:00+00:00",
  };
}

function hassWith(
  states: Record<string, HassEntity>,
  extra: Partial<ArcusHass> = {},
): ArcusHass {
  return {
    states,
    areas: {},
    devices: {},
    entities: {},
    callWS: async () => ({}) as never,
    callApi: async () => ({}) as never,
    callService: async () => undefined,
    ...extra,
  };
}

function config(input: Record<string, unknown> = {}): ArcusConfig {
  return normalizeConfig({ type: "custom:arcus-card", ...input });
}

describe("discoverSystems", () => {
  test("returns the same config when auto_discover is false", () => {
    const hass = hassWith({
      "weather.home": state("sunny"),
    });
    const base = config({ auto_discover: false });
    expect(discoverSystems(hass, base)).toBe(base);
  });

  test("an empty home discovers no sections", () => {
    const base = config();
    const discovered = discoverSystems(hassWith({}), base);
    expect(discovered.weather).toBeUndefined();
    expect(discovered.price).toBeUndefined();
    expect(discovered.solar).toBeUndefined();
    expect(discovered.water).toBeUndefined();
    expect(discovered.ventilation).toBeUndefined();
    expect(discovered.prayers).toBeUndefined();
    expect(discovered.security).toBeUndefined();
  });

  test("does not mutate the input config", () => {
    const base = config();
    const hass = hassWith({ "weather.home": state("sunny") });
    const discovered = discoverSystems(hass, base);
    expect(discovered.weather).toBe("weather.home");
    expect(base.weather).toBeUndefined();
  });

  test("prefers the canonical Home Assistant weather entity", () => {
    const hass = hassWith({
      "weather.forecast_somewhere": state("rainy"),
      "weather.forecast_home": state("sunny"),
    });
    expect(discoverSystems(hass, config()).weather).toBe(
      "weather.forecast_home",
    );
  });

  test("explicit weather always wins", () => {
    const hass = hassWith({
      "weather.forecast_home": state("sunny"),
      "weather.garden": state("rainy"),
    });
    const discovered = discoverSystems(
      hass,
      config({ weather: "weather.garden" }),
    );
    expect(discovered.weather).toBe("weather.garden");
  });

  test("discovers a Nordic spot price integration", () => {
    const hass = hassWith({
      "sensor.electricity_total_price": state("1.75", {
        unit_of_measurement: "kr/kWh",
      }),
      "sensor.energi_data_service": state("1.75", {
        raw_today: [{ hour: 0, price: 1.2 }],
        raw_tomorrow: [{ hour: 0, price: 1.3 }],
      }),
      "sensor.nord_pool_dk2_lowest_price": state("0.42"),
      "binary_sensor.nord_pool_dk2_tomorrow_price_available": state("on"),
    });
    const discovered = discoverSystems(hass, config());
    expect(discovered.price?.current).toBe("sensor.electricity_total_price");
    expect(discovered.price?.forecast).toBe("sensor.energi_data_service");
    expect(discovered.price?.lowest).toBe(
      "sensor.nord_pool_dk2_lowest_price",
    );
    expect(discovered.price?.tomorrow).toBe(
      "binary_sensor.nord_pool_dk2_tomorrow_price_available",
    );
  });

  test("does not invent a price when nothing looks like electricity", () => {
    const hass = hassWith({
      "sensor.temperature": state("21.4", { device_class: "temperature" }),
    });
    expect(discoverSystems(hass, config()).price).toBeUndefined();
  });

  test("discovers solar production and a home battery", () => {
    const hass = hassWith({
      "sensor.solar_energy_production_today": state("15.3", {
        device_class: "energy",
        unit_of_measurement: "kWh",
      }),
      "sensor.inverter_pv_power": state("4200", {
        device_class: "power",
        unit_of_measurement: "W",
      }),
      "sensor.battery_soc": state("27", {
        device_class: "battery",
        unit_of_measurement: "%",
      }),
      "sensor.battery_power": state("-800", {
        device_class: "power",
        unit_of_measurement: "W",
      }),
      "sensor.house_load_power": state("665", {
        device_class: "power",
        unit_of_measurement: "W",
      }),
      "sensor.grid_power": state("120", {
        device_class: "power",
        unit_of_measurement: "W",
      }),
    });
    const solar = discoverSystems(hass, config()).solar;
    expect(solar?.today).toBe("sensor.solar_energy_production_today");
    expect(solar?.power).toBe("sensor.inverter_pv_power");
    expect(solar?.batterySoc).toBe("sensor.battery_soc");
    expect(solar?.batteryPower).toBe("sensor.battery_power");
    expect(solar?.load).toBe("sensor.house_load_power");
    expect(solar?.grid).toBe("sensor.grid_power");
  });

  test("never mistakes a door sensor battery for a home battery", () => {
    const hass = hassWith({
      "sensor.front_door_battery": state("81", {
        device_class: "battery",
        unit_of_measurement: "%",
      }),
      "binary_sensor.front_door": state("off", { device_class: "door" }),
    });
    const discovered = discoverSystems(hass, config());
    expect(discovered.solar).toBeUndefined();
  });

  test("discovers MPPT 1 and 2 strings", () => {
    const hass = hassWith({
      "sensor.inverter_pv1_power": state("1200", {
        device_class: "power",
        unit_of_measurement: "W",
      }),
      "sensor.inverter_pv2_power": state("1100", {
        device_class: "power",
        unit_of_measurement: "W",
      }),
    });
    const solar = discoverSystems(hass, config()).solar;
    expect(solar?.pv1).toBe("sensor.inverter_pv1_power");
    expect(solar?.pv2).toBe("sensor.inverter_pv2_power");
  });

  test("discovers a smart water meter without a softener", () => {
    const hass = hassWith({
      "sensor.water_total": state("123.4", {
        device_class: "water",
        unit_of_measurement: "m³",
      }),
      "sensor.water_flow": state("0.2", {
        device_class: "volume_flow_rate",
        unit_of_measurement: "L/min",
      }),
    });
    const water = discoverSystems(hass, config()).water;
    expect(water?.total).toBe("sensor.water_total");
    expect(water?.flow).toBe("sensor.water_flow");
    expect(water?.state).toBeUndefined();
    expect(water?.salt).toBeUndefined();
  });

  test("discovers a BWT-style softener", () => {
    const hass = hassWith({
      "sensor.bwt_perla_state": state("OK"),
      "sensor.bwt_perla_day_output": state("12.2"),
      "sensor.bwt_perla_regenerativ_level": state("41"),
      "sensor.bwt_perla_regenerativ_days": state("12"),
    });
    const water = discoverSystems(hass, config()).water;
    expect(water?.state).toBe("sensor.bwt_perla_state");
    expect(water?.day).toBe("sensor.bwt_perla_day_output");
    expect(water?.salt).toBe("sensor.bwt_perla_regenerativ_level");
    expect(water?.saltDays).toBe("sensor.bwt_perla_regenerativ_days");
  });

  test("discovers a generic HRV ventilation unit", () => {
    const hass = hassWith(
      {
        "climate.vallox": state("auto", { hvac_modes: ["auto", "heat"] }),
        "sensor.vallox_room_temperature": state("21.8", {
          device_class: "temperature",
        }),
        "sensor.vallox_humidity": state("38", { device_class: "humidity" }),
        "sensor.vallox_fan_step": state("2"),
      },
      {
        entities: {
          "climate.vallox": {
            entity_id: "climate.vallox",
            device_id: "dev-vallox",
          },
          "sensor.vallox_room_temperature": {
            entity_id: "sensor.vallox_room_temperature",
            device_id: "dev-vallox",
          },
          "sensor.vallox_humidity": {
            entity_id: "sensor.vallox_humidity",
            device_id: "dev-vallox",
          },
          "sensor.vallox_fan_step": {
            entity_id: "sensor.vallox_fan_step",
            device_id: "dev-vallox",
          },
        },
      },
    );
    const ventilation = discoverSystems(hass, config()).ventilation;
    expect(ventilation?.climate).toBe("climate.vallox");
    expect(ventilation?.temperature).toBe(
      "sensor.vallox_room_temperature",
    );
    expect(ventilation?.humidity).toBe("sensor.vallox_humidity");
    expect(ventilation?.step).toBe("sensor.vallox_fan_step");
  });

  test("discovers prayer times only with the full set", () => {
    const prayers = {
      "sensor.islamic_prayer_times_fajr_prayer": state("05:32"),
      "sensor.islamic_prayer_times_dhuhr_prayer": state("12:04"),
      "sensor.islamic_prayer_times_asr_prayer": state("14:12"),
      "sensor.islamic_prayer_times_maghrib_prayer": state("16:21"),
      "sensor.islamic_prayer_times_isha_prayer": state("17:48"),
    };
    const discovered = discoverSystems(hassWith(prayers), config());
    expect(discovered.prayers).toMatchObject({
      fajr: "sensor.islamic_prayer_times_fajr_prayer",
      dhuhr: "sensor.islamic_prayer_times_dhuhr_prayer",
      asr: "sensor.islamic_prayer_times_asr_prayer",
      maghrib: "sensor.islamic_prayer_times_maghrib_prayer",
      isha: "sensor.islamic_prayer_times_isha_prayer",
    });

    const partial = discoverSystems(
      hassWith({
        "sensor.islamic_prayer_times_fajr_prayer": state("05:32"),
      }),
      config(),
    );
    expect(partial.prayers).toBeUndefined();
  });

  test("discovers leaks, locks, alarm panels, and sensor batteries", () => {
    const hass = hassWith({
      "binary_sensor.kitchen_water_leak": state("off", {
        device_class: "moisture",
      }),
      "lock.front_door": state("locked"),
      "alarm_control_panel.home": state("armed_away"),
      "sensor.front_door_battery": state("81", {
        device_class: "battery",
        unit_of_measurement: "%",
      }),
      "binary_sensor.front_door": state("off", { device_class: "door" }),
    });
    const security = discoverSystems(hass, config()).security;
    expect(security?.leaks).toEqual(["binary_sensor.kitchen_water_leak"]);
    expect(security?.locks).toEqual(["lock.front_door"]);
    expect(security?.alarm).toBe("alarm_control_panel.home");
    expect(security?.batteries).toEqual(["sensor.front_door_battery"]);
  });

  test("explicit security entries are not overwritten", () => {
    const hass = hassWith({
      "binary_sensor.kitchen_water_leak": state("off", {
        device_class: "moisture",
      }),
      "binary_sensor.bathroom_water_leak": state("off", {
        device_class: "moisture",
      }),
      "lock.front_door": state("locked"),
    });
    const discovered = discoverSystems(
      hass,
      config({
        security: { leaks: ["binary_sensor.bathroom_water_leak"] },
      }),
    );
    expect(discovered.security?.leaks).toEqual([
      "binary_sensor.bathroom_water_leak",
    ]);
    expect(discovered.security?.locks).toEqual(["lock.front_door"]);
  });

  test("ignores unavailable and hidden entities", () => {
    const hass = hassWith(
      {
        "weather.home": state("unavailable"),
        "weather.garden": state("sunny"),
        "lock.hidden": state("locked"),
      },
      {
        entities: {
          "lock.hidden": {
            entity_id: "lock.hidden",
            hidden_by: "user",
          },
          "weather.garden": { entity_id: "weather.garden" },
        },
      },
    );
    const discovered = discoverSystems(hass, config());
    expect(discovered.weather).toBe("weather.garden");
    expect(discovered.security?.locks).toBeUndefined();
  });
});
