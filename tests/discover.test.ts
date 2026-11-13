import { describe, expect, test } from "vitest";
import { normalizeConfig } from "../src/config";
import { buildModel } from "../src/model/build";
import { discoverRooms, entitiesForArea } from "../src/model/discover";
import { HOME_AREA_IDS, makeConfig, makeHass } from "./fixtures/home";

// The mock home is in Europe/Copenhagen. Pin the process zone so the price
// hour and prayer times are deterministic on CI as well.
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T21:00:00+01:00");

describe("discoverRooms", () => {
  test("selects included areas in configured order and appends the rest", () => {
    const config = makeConfig({
      areas: { order: ["skur", "stue"], exclude: ["kokken"] },
    });
    const rooms = discoverRooms(makeHass(), config);

    expect(rooms.map((room) => room.areaId)).toEqual([
      "skur",
      "stue",
      "sovevaerelse",
      "kontor",
      "bryggers",
      "entre",
    ]);
    expect(rooms.every((room) => room.id === room.areaId)).toBe(true);
    expect(rooms[0].wide).toBe(true);
    expect(rooms[1].wide).toBe(false);
  });

  test("honours an explicit include list", () => {
    const config = makeConfig({
      areas: { include: ["entre", "kokken"], order: ["kokken", "entre"] },
    });
    const rooms = discoverRooms(makeHass(), config);

    expect(rooms.map((room) => room.areaId)).toEqual(["kokken", "entre"]);
  });

  test("resolves an entity through its device area and keeps unavailable temps", () => {
    const rooms = discoverRooms(makeHass(), makeConfig());
    const stue = rooms.find((room) => room.areaId === "stue")!;

    // The sensor has no area of its own; its device is in Stue.
    expect(stue.temp?.entityId).toBe(
      "sensor.alpstuga_air_quality_monitor_temperatur_2",
    );
    expect(stue.temp?.state).toBe("unavailable");
    expect(stue.tempFallback?.entityId).toBe("climate.wavin_stue");
    expect(stue.tempFallback?.attributes?.current_temperature).toBe(22.9);
    expect(stue.climate?.entityId).toBe("climate.wavin_stue");
    expect(stue.media?.entityId).toBe("media_player.lg_speaker_sp8ya_2");
    expect(stue.openings.map((opening) => opening.id)).toEqual(
      expect.arrayContaining([
        "binary_sensor.myggbett_door_window_sensor_dor_7",
        "binary_sensor.myggbett_door_window_sensor_dor_8",
      ]),
    );
  });

  test("skips hidden, disabled, diagnostic, config, and stateless entities", () => {
    const hass = makeHass();
    const ids = entitiesForArea(hass, "kokken").map(
      (entity) => entity.entity_id,
    );

    expect(ids).not.toContain("sensor.kokken_hidden_temperature");
    expect(ids).not.toContain("sensor.kokken_disabled_temperature");
    expect(ids).not.toContain("sensor.kokken_missing_state_temperature");

    const kokken = discoverRooms(hass, makeConfig()).find(
      (room) => room.areaId === "kokken",
    )!;
    // The only temperature sensors in the kitchen are hidden/disabled/stateless.
    expect(kokken.temp).toBeNull();
    expect(kokken.tempFallback?.entityId).toBe("climate.wavin_kokken");
    expect(kokken.humidity).toBeNull();
  });

  test("prefers an available temperature and skips diagnostic/config entities", () => {
    const hass = makeHass();
    hass.entities[
      "sensor.alpstuga_air_quality_monitor_temperatur"
    ].entity_category = "diagnostic";
    hass.entities["sensor.alpstuga_air_quality_monitor_pm25"].entity_category =
      "config";

    const backupId = "sensor.kontor_temperature_available";
    hass.states[backupId] = {
      entity_id: backupId,
      state: "21.0",
      attributes: {
        device_class: "temperature",
        friendly_name: "Kontor temperatur",
        unit_of_measurement: "°C",
      },
      last_changed: "2026-11-13T20:00:00+01:00",
      last_updated: "2026-11-13T20:00:00+01:00",
    };
    hass.entities[backupId] = {
      entity_id: backupId,
      area_id: "kontor",
      device_id: null,
      name: null,
      original_name: "Kontor temperatur",
      platform: "mock",
      unique_id: backupId,
      disabled_by: null,
      hidden_by: null,
      entity_category: null,
    };

    const kontor = discoverRooms(hass, makeConfig()).find(
      (room) => room.areaId === "kontor",
    )!;
    expect(kontor.temp?.entityId).toBe(backupId);
    expect(kontor.temp?.state).toBe("21.0");
    expect(kontor.pm25).toBeNull();
  });

  test("uses a light group as master without duplicating members", () => {
    const kokken = discoverRooms(makeHass(), makeConfig()).find(
      (room) => room.areaId === "kokken",
    )!;

    expect(kokken.lights).toHaveLength(1);
    expect(kokken.lights[0].entityId).toBe("light.kokken");
    expect(kokken.lights[0].members).toHaveLength(9);
    expect(kokken.lights[0].extra).toEqual([
      "light.192_168_110_242_enhaettelys",
    ]);

    const flattened = kokken.lights.flatMap((group) => [
      group.entityId,
      ...group.members,
      ...group.extra,
    ]);
    expect(new Set(flattened).size).toBe(flattened.length);
  });

  test("falls back to one group per light when an area has no group", () => {
    const hass = makeHass();
    delete hass.states["light.kokken"].attributes.entity_id;

    const kokken = discoverRooms(hass, makeConfig()).find(
      (room) => room.areaId === "kokken",
    )!;

    expect(kokken.lights).toHaveLength(11);
    expect(kokken.lights.every((group) => group.members.length === 0)).toBe(
      true,
    );
    expect(kokken.lights.map((group) => group.entityId)).toContain(
      "light.kokken",
    );
  });

  test("keeps leak sensors separate from door/window openings", () => {
    const rooms = discoverRooms(makeHass(), makeConfig());
    const bryggers = rooms.find((room) => room.areaId === "bryggers")!;

    expect(bryggers.openings).toEqual([]);
    expect(bryggers.leak?.entityId).toBe(
      "binary_sensor.klippbok_water_leak_sensor_water_leak_2",
    );
  });

  test("applies room entity, light, opening, name, and tint overrides", () => {
    const config = makeConfig({
      rooms: {
        kontor: {
          name: "Arbejde",
          tint: "#123456",
          temp: "sensor.timmerflotte_temp_hmd_sensor_temperatur_2",
          humidity: "sensor.alpstuga_air_quality_monitor_luftfugtighed",
          climate: "climate.wavin_kontor",
          media: "media_player.lg_speaker_sp8ya_2",
          leak: "binary_sensor.klippbok_water_leak_sensor_water_leak",
          battery: "sensor.myggbett_door_window_sensor_batteri",
          lights: ["light.kokken", "light.kajplats_gu10_cws_470lm_7"],
          openings: [
            {
              id: "binary_sensor.myggbett_door_window_sensor_dor",
              name: "Kontor dør",
              kind: "Vindue",
            },
          ],
        },
      },
    });
    const kontor = discoverRooms(makeHass(), config).find(
      (room) => room.areaId === "kontor",
    )!;

    expect(kontor.name).toBe("Arbejde");
    expect(kontor.tint).toBe("#123456");
    expect(kontor.temp?.entityId).toBe(
      "sensor.timmerflotte_temp_hmd_sensor_temperatur_2",
    );
    expect(kontor.temp?.state).toBe("22.9");
    expect(kontor.tempFallback?.entityId).toBe("climate.wavin_kontor");
    expect(kontor.humidity?.entityId).toBe(
      "sensor.alpstuga_air_quality_monitor_luftfugtighed",
    );
    expect(kontor.media?.entityId).toBe("media_player.lg_speaker_sp8ya_2");
    expect(kontor.leak?.entityId).toBe(
      "binary_sensor.klippbok_water_leak_sensor_water_leak",
    );
    expect(kontor.battery?.entityId).toBe(
      "sensor.myggbett_door_window_sensor_batteri",
    );
    expect(kontor.lights).toHaveLength(1);
    expect(kontor.lights[0].entityId).toBe("light.kokken");
    expect(kontor.lights[0].members).toContain(
      "light.kajplats_gu10_cws_470lm_7",
    );
    expect(kontor.openings).toEqual([
      {
        id: "binary_sensor.myggbett_door_window_sensor_dor",
        name: "Kontor dør",
        kind: "Vindue",
        room: "Arbejde",
      },
    ]);
  });

  test("an override may reference an entity that is temporarily missing", () => {
    const config = makeConfig({
      rooms: { kontor: { temp: "sensor.not_there_yet" } },
    });
    const kontor = discoverRooms(makeHass(), config).find(
      (room) => room.areaId === "kontor",
    )!;

    expect(kontor.temp).toMatchObject({ entityId: "sensor.not_there_yet" });
    expect(kontor.temp?.state).toBeUndefined();
  });

  test("maps a stove icon and falls back to the area name without one", () => {
    const hass = makeHass();
    const areas = {
      ...hass.areas,
      kokken: { ...hass.areas.kokken, icon: "mdi:stove" },
      entre: { ...hass.areas.entre, icon: null },
      lille_gang: { ...hass.areas.lille_gang, icon: null },
    };
    const config = makeConfig({
      areas: {
        include: ["kokken", "entre", "lille_gang"],
        order: ["kokken", "entre", "lille_gang"],
      },
    });
    const rooms = discoverRooms({ ...hass, areas }, config);

    expect(rooms.map((room) => room.icon)).toEqual([
      "counter",
      "door",
      "stairs",
    ]);
  });

  test("an empty home has no rooms", () => {
    const hass = makeHass({
      areas: {},
      devices: {},
      entities: {},
      states: {},
    });
    expect(
      discoverRooms(hass, normalizeConfig({ type: "custom:arcus-card" })),
    ).toEqual([]);
  });
});

describe("buildModel", () => {
  test("builds the flat sections, heating, system card, and shed", () => {
    const model = buildModel(makeHass(), makeConfig(), NOW);

    expect(model.rooms).toHaveLength(HOME_AREA_IDS.length);
    expect(model.lights).toHaveLength(3);
    expect(model.lights.map((group) => group.entityId)).toEqual([
      "light.kokken",
      "light.bryggers",
      "light.entre",
    ]);
    expect(model.heating).toHaveLength(8);
    expect(model.heating.map((zone) => zone.entity.entityId)).not.toContain(
      "climate.nilan602_nilan",
    );
    expect(model.heating.map((zone) => zone.entity.entityId)).not.toContain(
      "climate.wavin_kanal_6",
    );
    expect(
      model.heating.find(
        (zone) => zone.entity.entityId === "climate.wavin_stue",
      )?.opening?.entityId,
    ).toBe("binary_sensor.gulvvarme_stue_abninger");
    expect(model.heatingReserve.map((zone) => zone.entity.entityId)).toEqual([
      "climate.wavin_kanal_6",
      "climate.wavin_kanal_10",
      "climate.wavin_kanal_11",
    ]);

    expect(model.systemCards).toHaveLength(1);
    expect(model.systemCards[0]).toMatchObject({
      id: "ventilation",
      icon: "fan",
    });
    expect(model.systemCards[0].temp?.entityId).toBe(
      "sensor.nilan602_actual_room_temperature",
    );
    expect(model.skur?.temp?.entityId).toBe(
      "sensor.timmerflotte_temp_hmd_sensor_temperatur",
    );
    expect(model.skur?.humidity?.entityId).toBe(
      "sensor.timmerflotte_temp_hmd_sensor_luftfugtighed",
    );

    expect(model.water?.state).toBe("OK");
    expect(model.water?.day).toBeCloseTo(12.222);
    expect(model.security?.open).toBe(0);
    expect(model.security?.leak).toBe(false);
    expect(model.security?.batteries).toHaveLength(12);
    expect(model.tech?.router).toBeCloseTo(0.337);
    expect(model.tech?.routerOnline).toBe(true);
    expect(model.economy?.value).toBeCloseTo(97.15);
    expect(model.ventilation?.temperature).toBeCloseTo(23.2);
    expect(model.ventilation?.fanMode).toBe("2");
    expect(model.solar?.batterySoc).toBe(27);
    expect(model.solar?.load).toBe(665);
    expect(model.solar?.forecastSeries).toHaveLength(96);
    expect(model.solar?.tomorrowSeries).toHaveLength(96);
    expect(model.solar?.heliosPath).toBe("/nyt-overblik/solceller-helios");
    expect(model.weather?.state).toBe("partlycloudy");
  });

  test("normalises the price curve to the current total price", () => {
    const model = buildModel(makeHass(), makeConfig(), NOW);
    const price = model.price!;

    expect(price.values).toHaveLength(24);
    expect(price.now).toBeCloseTo(1.75);
    expect(price.values[21]).toBeCloseTo(1.75);
    expect(price.min).toBeLessThan(price.now);
    expect(price.max).toBeGreaterThan(price.now);
    expect(price.cheapest).toMatchObject({ start: 21, end: 24 });
    expect(price.cheapest!.avg).toBeCloseTo(1.603, 3);
    expect(price.tomorrow).toBe(false);
    expect(model.energy).toBe(price);
  });

  test("falls back to the whole day for the cheapest window late at night", () => {
    const model = buildModel(
      makeHass(),
      makeConfig(),
      new Date("2026-11-13T22:30:00+01:00"),
    );
    expect(model.price?.cheapest).toMatchObject({ start: 0, end: 3 });
  });

  test("picks the next prayer and wraps to tomorrow's Fajr", () => {
    const noon = buildModel(
      makeHass(),
      makeConfig(),
      new Date("2026-11-13T12:00:00+01:00"),
    );
    expect(noon.prayers?.times.map((prayer) => prayer.id)).toEqual([
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ]);
    expect(noon.prayers?.next?.id).toBe("asr");
    expect(noon.prayers?.next?.time.getTime()).toBeGreaterThan(
      new Date("2026-11-13T12:00:00+01:00").getTime(),
    );

    const lateTime = new Date("2026-11-13T23:00:00+01:00");
    const late = buildModel(makeHass(), makeConfig(), lateTime);
    expect(late.prayers?.next?.id).toBe("fajr");
    expect(late.prayers!.next!.time.getTime()).toBeGreaterThan(
      lateTime.getTime(),
    );
    expect(late.prayers!.next!.time.getDate()).toBe(14);
  });

  test("derives localized alerts and enables the chapters", () => {
    const model = buildModel(makeHass(), makeConfig(), NOW);

    expect(model.alerts.map((alert) => alert.key)).toEqual([
      "nilanfilter",
      "cf",
    ]);
    expect(model.alerts[0]).toMatchObject({
      sev: 2,
      title: "Nilan vil have nyt filter",
      route: "ventilation",
    });
    expect(model.alerts[1]).toMatchObject({
      sev: 1,
      title: "Cloudflare svarer ikke",
      route: "teknik",
    });
    expect(model.chapters).toEqual({
      energi: true,
      sol: true,
      vand: true,
      sikkerhed: true,
      ventilation: true,
      teknik: true,
      oekonomi: true,
      lys: true,
      varme: true,
      alarmer: true,
    });

    const overridden = buildModel(
      makeHass(),
      makeConfig({ chapters: { lys: false } }),
      NOW,
    );
    expect(overridden.chapters.lys).toBe(false);
    expect(overridden.chapters.varme).toBe(true);
  });

  test("raises leak and window alerts from room data", () => {
    const hass = makeHass();
    hass.states["binary_sensor.klippbok_water_leak_sensor_water_leak"].state =
      "on";
    hass.states["binary_sensor.myggbett_door_window_sensor_dor_7"].state = "on";

    const model = buildModel(hass, makeConfig(), NOW);
    expect(model.alerts.map((alert) => alert.key)).toEqual(
      expect.arrayContaining(["leak_kokken", "windows"]),
    );
    expect(model.security?.open).toBe(1);
    expect(model.security?.leak).toBe(true);
    expect(model.chapters.sikkerhed).toBe(true);
  });

  test("an empty home returns a valid model with every chapter off", () => {
    const hass = makeHass({
      areas: {},
      devices: {},
      entities: {},
      states: {},
    });
    const model = buildModel(
      hass,
      normalizeConfig({ type: "custom:arcus-card" }),
    );

    expect(model.rooms).toEqual([]);
    expect(model.lights).toEqual([]);
    expect(model.heating).toEqual([]);
    expect(model.heatingReserve).toEqual([]);
    expect(model.systemCards).toEqual([]);
    expect(model.alerts).toEqual([]);
    expect(model.price).toBeUndefined();
    expect(model.solar).toBeUndefined();
    expect(model.prayers).toBeUndefined();
    expect(model.security).toBeUndefined();
    expect(model.tech).toBeUndefined();
    expect(model.economy).toBeUndefined();
    expect(model.ventilation).toBeUndefined();
    expect(Object.values(model.chapters).every((enabled) => !enabled)).toBe(
      true,
    );
  });
});
