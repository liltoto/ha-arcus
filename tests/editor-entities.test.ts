import { describe, expect, test } from "vitest";
import {
  datalistId,
  suggestEntities,
  type EntitySuggestionSpec,
} from "../src/editor-entities";
import type { ArcusHass, HassEntity } from "../src/types";

function state(
  value: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  return {
    state: value,
    attributes,
    last_changed: "2026-11-13T00:00:00+00:00",
    last_updated: "2026-11-13T00:00:00+00:00",
  };
}

function hassWith(states: Record<string, HassEntity>): ArcusHass {
  return {
    states,
    areas: {},
    devices: {},
    entities: {},
    callWS: async () => ({}) as never,
    callApi: async () => ({}) as never,
    callService: async () => undefined,
  };
}

const HOME = hassWith({
  "weather.home": state("sunny", { friendly_name: "Home weather" }),
  "weather.garden": state("rainy"),
  "sensor.solar_power": state("2100", {
    device_class: "power",
    friendly_name: "Solar power",
  }),
  "sensor.solar_today": state("12.4", {
    device_class: "energy",
    friendly_name: "Solar today",
  }),
  "sensor.battery_soc": state("64", {
    device_class: "battery",
    friendly_name: "Battery SoC",
  }),
  "sensor.front_door_battery": state("81", {
    device_class: "battery",
    friendly_name: "Front door battery",
  }),
  "sensor.electricity_total_price": state("1.75", {
    friendly_name: "Electricity total price",
  }),
  "sensor.energi_data_service": state("1.75", {
    raw_today: [{ hour: 0, price: 1.2 }],
  }),
  "binary_sensor.router_online": state("on"),
  "binary_sensor.kitchen_water_leak": state("off", {
    device_class: "moisture",
  }),
  "light.stue": state("on"),
  "sensor.offline_power": state("unavailable", {
    device_class: "power",
  }),
});

describe("suggestEntities", () => {
  test("filters by domain", () => {
    const spec: EntitySuggestionSpec = { domains: ["weather"] };
    expect(suggestEntities(HOME, spec)).toEqual([
      "weather.garden",
      "weather.home",
    ]);
  });

  test("filters by device class and puts name matches first", () => {
    const spec: EntitySuggestionSpec = {
      domains: ["sensor"],
      deviceClasses: ["power"],
      name: /solar/i,
    };
    const result = suggestEntities(HOME, spec);
    expect(result[0]).toBe("sensor.solar_power");
    expect(result).toContain("sensor.offline_power");
    expect(result).not.toContain("light.stue");
  });

  test("keeps unavailable entities but ranks them last", () => {
    const spec: EntitySuggestionSpec = {
      domains: ["sensor"],
      deviceClasses: ["power"],
    };
    const result = suggestEntities(HOME, spec);
    expect(result).toEqual([
      "sensor.solar_power",
      "sensor.offline_power",
    ]);
  });

  test("requires a non-empty forecast attribute", () => {
    const spec: EntitySuggestionSpec = {
      domains: ["sensor"],
      requireAttributes: ["raw_today", "prices"],
    };
    expect(suggestEntities(HOME, spec)).toEqual([
      "sensor.energi_data_service",
    ]);
  });

  test("matches the friendly name", () => {
    const spec: EntitySuggestionSpec = {
      domains: ["sensor"],
      name: /electricity total/i,
    };
    expect(suggestEntities(HOME, spec)).toEqual([
      "sensor.electricity_total_price",
    ]);
  });

  test("a strict name filter stays empty when the integration is absent", () => {
    const spec: EntitySuggestionSpec = {
      domains: ["sensor"],
      name: /does-not-exist/,
    };
    // No unrelated sensors leak into a field meant for a specific integration.
    expect(suggestEntities(HOME, spec)).toEqual([]);
  });

  test("never leaks other domains for a constrained field", () => {
    const spec: EntitySuggestionSpec = { domains: ["alarm_control_panel"] };
    expect(suggestEntities(HOME, spec)).toEqual([]);
  });

  test("skips hidden and disabled registry entries", () => {
    const hass = hassWith(HOME.states);
    hass.entities = {
      "weather.home": { entity_id: "weather.home", hidden_by: "user" },
      "weather.garden": { entity_id: "weather.garden", disabled_by: "user" },
    };
    expect(suggestEntities(hass, { domains: ["weather"] })).toEqual([]);
  });

  test("a strict device-class filter only keeps name matches", () => {
    const spec: EntitySuggestionSpec = {
      domains: ["sensor"],
      deviceClasses: ["battery"],
      name: /soc/i,
      strict: true,
    };
    expect(suggestEntities(HOME, spec)).toEqual(["sensor.battery_soc"]);
  });

  test("caps the number of suggestions", () => {
    const states: Record<string, HassEntity> = {};
    for (let index = 0; index < 120; index += 1) {
      states[`sensor.item_${index}`] = state(String(index));
    }
    const result = suggestEntities(hassWith(states), { domains: ["sensor"] }, 25);
    expect(result).toHaveLength(25);
  });

  test("returns nothing without hass", () => {
    expect(suggestEntities(undefined, { domains: ["sensor"] })).toEqual([]);
  });
});

describe("datalistId", () => {
  test("slugs the config path", () => {
    expect(datalistId("solar.power")).toBe("arcus-entities-solar-power");
    expect(datalistId("energy.ev.plugged")).toBe(
      "arcus-entities-energy-ev-plugged",
    );
  });
});
