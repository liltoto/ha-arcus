import { describe, expect, test } from "vitest";
import { createTranslator } from "../src/localize";
import {
  resolveCurrency,
  resolvePriceUnit,
  resolveTempUnit,
} from "../src/format";
import { buildModel } from "../src/model/build";
import {
  APARTMENT_ROOMS,
  SUBURBAN_ROOMS,
  makeApartmentConfig,
  makeApartmentHass,
  makeMinimalConfig,
  makeMinimalHass,
  makeSuburbanConfig,
  makeSuburbanHass,
} from "./fixtures/archetypes";

// Forecast points and mock homes are in local time; pin the zone for CI.
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T21:00:00+01:00");

describe("urban apartment archetype", () => {
  const hass = makeApartmentHass();
  const config = makeApartmentConfig();
  const model = buildModel(hass, config, NOW);

  test("discovers every room with localized opening kinds", () => {
    expect(model.rooms.map((room) => room.id)).toEqual([...APARTMENT_ROOMS]);
    const kitchen = model.rooms.find((room) => room.id === "kitchen")!;
    expect(kitchen.openings.map((opening) => opening.kind)).toContain("Door");
    expect(kitchen.co2?.entityId).toBe("sensor.kitchen_co2");
  });

  test("enables only the chapters the apartment actually has", () => {
    expect(model.chapters).toMatchObject({
      energi: true,
      sol: false,
      vand: false,
      ventilation: false,
      oekonomi: false,
      lys: true,
      varme: true,
    });
  });

  test("has no solar, water, ventilation, or economy model", () => {
    expect(model.solar).toBeUndefined();
    expect(model.water).toBeUndefined();
    expect(model.ventilation).toBeUndefined();
    expect(model.economy).toBeUndefined();
  });

  test("resolves currency, price unit, and temperature from HA config", () => {
    expect(resolveCurrency(hass, config, "en")).toBe("EUR");
    expect(resolvePriceUnit(hass, config, "en")).toBe("EUR/kWh");
    expect(resolveTempUnit(hass, config)).toBe("°C");
  });

  test("still builds an alert for the kitchen leak when it fires", () => {
    const wet = makeApartmentHass();
    wet.states["binary_sensor.kitchen_water_leak"].state = "on";
    const wetModel = buildModel(wet, config, NOW);
    expect(wetModel.security?.leak).toBe(true);
    expect(wetModel.alerts.map((alert) => alert.key)).toContain("leak_kitchen");
  });
});

describe("suburban multi-floor home archetype", () => {
  const hass = makeSuburbanHass();
  const config = makeSuburbanConfig();
  const model = buildModel(hass, config, NOW);

  test("discovers two floors plus the outdoor garage", () => {
    const byId = Object.fromEntries(model.rooms.map((room) => [room.id, room]));
    expect(Object.keys(byId)).toEqual(
      expect.arrayContaining([...SUBURBAN_ROOMS]),
    );
    expect(byId.living_room.floorName).toBe("Ground floor");
    expect(byId.office.floorName).toBe("First floor");
    expect(byId.office.floorLevel).toBe(1);
    expect(byId.garage.kind).toBe("outdoor");
    expect(byId.garage.wide).toBe(true);
  });

  test("finds covers and the side-door lock in the garage", () => {
    const garage = model.rooms.find((room) => room.id === "garage")!;
    expect(garage.covers?.map((cover) => cover.entityId)).toEqual([
      "cover.garage_door",
    ]);
    expect(garage.lock?.entityId).toBe("lock.garage_side_door");
    expect(model.security?.locks?.map((lock) => lock.entityId)).toEqual(
      expect.arrayContaining(["lock.garage_side_door"]),
    );
  });

  test("auto-discovers the alarm panel, front-door lock, and water meter", () => {
    expect(model.security?.alarm?.entityId).toBe(
      "alarm_control_panel.home_alarm",
    );
    expect(model.security?.locks?.map((lock) => lock.entityId)).toContain(
      "lock.front_door",
    );
    expect(model.water?.total).not.toBeNull();
    expect(model.water?.day).not.toBeNull();
    expect(model.water?.state).toBeNull();
    expect(model.water?.salt).toBeNull();
  });

  test("discovers a solar system without a battery and PV1/PV2 strings", () => {
    expect(model.solar?.pv1).toBe(2100);
    expect(model.solar?.pv2).toBe(1950);
    expect(model.solar?.today).toBeCloseTo(22.4);
    expect(model.solar?.batterySoc).toBeNull();
    expect(model.chapters.sol).toBe(true);
  });

  test("uses the US unit overrides", () => {
    expect(resolveCurrency(hass, config, "en")).toBe("$");
    expect(resolvePriceUnit(hass, config, "en")).toBe("$/kWh");
    expect(resolveTempUnit(hass, config)).toBe("°F");
  });

  test("keeps the EV and appliance config on the normalized model config", () => {
    expect(config.energy?.ev?.name).toBe("Rivian");
    expect(config.energy?.appliances?.[0].name).toBe("Freezer");
  });
});

describe("minimal auto-discovery archetype", () => {
  const hass = makeMinimalHass();
  const config = makeMinimalConfig();
  const model = buildModel(hass, config, NOW);

  test("adds no chapters for hardware the home does not have", () => {
    expect(model.chapters).toMatchObject({
      sol: false,
      vand: false,
      ventilation: false,
      oekonomi: false,
      teknik: false,
      lys: true,
      varme: true,
    });
  });

  test("auto-discovers the weather entity without any config", () => {
    expect(model.weather?.state).toBe("sunny");
  });

  test("discovers the moisture sensor as a potential leak", () => {
    const wet = makeMinimalHass();
    wet.states["binary_sensor.studio_moisture"].state = "on";
    const wetModel = buildModel(wet, config, NOW);
    expect(wetModel.security?.leak).toBe(true);
  });

  test("falls back to Danish currency and Celsius", () => {
    expect(resolveCurrency(hass, config, "da")).toBe("kr");
    expect(resolveTempUnit(hass, config)).toBe("°C");
  });

  test("localizes the leak alert with the room name", () => {
    const wet = makeMinimalHass();
    wet.states["binary_sensor.studio_moisture"].state = "on";
    const wetModel = buildModel(wet, config, NOW);
    const t = createTranslator("da");
    expect(wetModel.alerts[0]?.title).toBe(`${t("water.leak")} · Studio`);
    expect(wetModel.alerts[0]?.route).toBe("rum/studio");
  });
});
