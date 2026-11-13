import { describe, expect, test } from "vitest";
import {
  DEFAULT_CONFIG,
  configSignature,
  normalizeConfig,
  validateConfig,
} from "../src/config";

const card = { type: "custom:arcus-card" };

describe("normalizeConfig defaults", () => {
  test("defaults to comfortable, auto language, auto appearance", () => {
    const c = normalizeConfig(card);
    expect(c.density).toBe("comfortable");
    expect(c.language).toBe("auto");
    expect(c.appearance).toBe("auto");
    expect(c.atmosphere).toBe("auto");
    expect(c.areas.include).toEqual([]);
    expect(c.areas.exclude).toEqual([]);
    expect(c.areas.order).toEqual([]);
    expect(c.quick_actions).toEqual([]);
    expect(c.rooms).toEqual({});
    expect(c.chapters).toEqual({});
    expect(c.show_weather_forecast).toBe(true);
  });

  test("keeps the prototype brand defaults", () => {
    const c = normalizeConfig({});
    expect(c.type).toBe("custom:arcus-card");
    expect(c.title).toBe("HJEM");
    expect(c.subtitle).toBe("ARCUS");
  });

  test("does not share mutable defaults with DEFAULT_CONFIG", () => {
    const a = normalizeConfig(card);
    const b = normalizeConfig(card);
    a.areas.include.push("stue");
    a.quick_actions.push({
      label: "Test",
      action: { action: "call-service" },
    });
    expect(b.areas.include).toEqual([]);
    expect(b.quick_actions).toEqual([]);
    expect(DEFAULT_CONFIG.areas.include).toEqual([]);
  });
});

describe("areas", () => {
  test("accepts a string array as include", () => {
    const c = normalizeConfig({ ...card, areas: ["stue", "kokken"] });
    expect(c.areas).toEqual({
      include: ["stue", "kokken"],
      exclude: [],
      order: [],
    });
  });

  test("normalizes the object form and removes duplicates", () => {
    const c = normalizeConfig({
      ...card,
      areas: {
        include: ["stue", " stue ", "kokken"],
        exclude: ["kontor"],
        order: ["kokken", "kokken", "stue"],
      },
    });
    expect(c.areas).toEqual({
      include: ["stue", "kokken"],
      exclude: ["kontor"],
      order: ["kokken", "stue"],
    });
  });

  test("rejects a non-array area include", () => {
    expect(() =>
      normalizeConfig({ ...card, areas: { include: "stue" } }),
    ).toThrow(/areas\.include/);
  });

  test("rejects a non-string area ID", () => {
    expect(() =>
      normalizeConfig({ ...card, areas: { order: ["stue", 42] } }),
    ).toThrow(/areas\.order\[1\]/);
  });

  test("rejects a completely wrong areas value", () => {
    expect(() => normalizeConfig({ ...card, areas: 42 })).toThrow(
      /Arcus: areas/,
    );
  });
});

describe("enum fields", () => {
  test("accepts the documented values", () => {
    const c = normalizeConfig({
      ...card,
      language: "en",
      appearance: "light",
      atmosphere: "dawn",
      density: "compact",
    });
    expect(c.language).toBe("en");
    expect(c.appearance).toBe("light");
    expect(c.atmosphere).toBe("dawn");
    expect(c.density).toBe("compact");
  });

  test("rejects an invalid density", () => {
    expect(() => normalizeConfig({ ...card, density: "tiny" })).toThrow(
      /density/,
    );
  });

  test("rejects an invalid language, appearance, and atmosphere", () => {
    expect(() => normalizeConfig({ ...card, language: "de" })).toThrow(
      /language/,
    );
    expect(() => normalizeConfig({ ...card, appearance: "dim" })).toThrow(
      /appearance/,
    );
    expect(() => normalizeConfig({ ...card, atmosphere: "noon" })).toThrow(
      /atmosphere/,
    );
  });
});

describe("quick actions", () => {
  test("normalizes label, icon, entity, and action", () => {
    const c = normalizeConfig({
      ...card,
      quick_actions: [
        {
          label: "  Sengetid  ",
          icon: "moon",
          entity: "input_button.bedtime",
          action: {
            action: "call-service",
            service: "input_button.press",
            target: { entity_id: "input_button.bedtime" },
          },
        },
      ],
    });
    expect(c.quick_actions).toEqual([
      {
        label: "Sengetid",
        icon: "moon",
        entity: "input_button.bedtime",
        action: {
          action: "call-service",
          service: "input_button.press",
          target: { entity_id: "input_button.bedtime" },
        },
      },
    ]);
  });

  test("rejects an item without a label", () => {
    expect(() =>
      normalizeConfig({
        ...card,
        quick_actions: [{ action: { action: "call-service" } }],
      }),
    ).toThrow(/quick_actions\[0\]\.label/);
  });

  test("rejects an item without an action object", () => {
    expect(() =>
      normalizeConfig({
        ...card,
        quick_actions: [{ label: "Sengetid" }],
      }),
    ).toThrow(/quick_actions\[0\]\.action/);

    expect(() =>
      normalizeConfig({
        ...card,
        quick_actions: [{ label: "Sengetid", action: "input_button.press" }],
      }),
    ).toThrow(/quick_actions\[0\]\.action/);
  });

  test("rejects a non-array quick_actions value", () => {
    expect(() =>
      normalizeConfig({ ...card, quick_actions: { label: "Sengetid" } }),
    ).toThrow(/quick_actions/);
  });
});

describe("section entity maps", () => {
  test("trims entity IDs and drops empty values", () => {
    const c = normalizeConfig({
      ...card,
      price: {
        current: " sensor.electricity_total_price ",
        sell: "",
        spot: null,
      },
      prayers: { fajr: "sensor.fajr", sunrise: "sensor.sunrise" },
    });
    expect(c.price).toEqual({ current: "sensor.electricity_total_price" });
    expect(c.prayers).toEqual({
      fajr: "sensor.fajr",
      sunrise: "sensor.sunrise",
    });
  });

  test("rejects a non-string entity ID", () => {
    expect(() => normalizeConfig({ ...card, price: { current: 42 } })).toThrow(
      /price\.current/,
    );
  });

  test("normalizes safe security arrays", () => {
    const c = normalizeConfig({
      ...card,
      security: {
        windowAlert: "input_boolean.window_alert_notification",
        leaks: ["binary_sensor.kitchen_leak"],
      },
    });
    expect(c.security).toEqual({
      windowAlert: "input_boolean.window_alert_notification",
      leaks: ["binary_sensor.kitchen_leak"],
    });
  });
});

describe("room overrides", () => {
  test("accepts a single light and string openings", () => {
    const c = normalizeConfig({
      ...card,
      rooms: {
        stue: {
          name: "Stue",
          tint: "#7FAFC4",
          temp: "sensor.stue_temperature",
          lights: "light.stue",
          openings: [
            "binary_sensor.stue_door",
            { id: "binary_sensor.stue_window", kind: "Vindue" },
          ],
        },
      },
    });
    expect(c.rooms.stue).toEqual({
      name: "Stue",
      tint: "#7FAFC4",
      temp: "sensor.stue_temperature",
      lights: ["light.stue"],
      openings: [
        { id: "binary_sensor.stue_door" },
        { id: "binary_sensor.stue_window", kind: "Vindue" },
      ],
    });
  });

  test("rejects a non-entity lights value", () => {
    expect(() =>
      normalizeConfig({ ...card, rooms: { stue: { lights: 42 } } }),
    ).toThrow(/rooms\.stue\.lights/);
  });

  test("rejects an opening without an id", () => {
    expect(() =>
      normalizeConfig({ ...card, rooms: { stue: { openings: [{}] } } }),
    ).toThrow(/rooms\.stue\.openings\[0\]\.id/);
  });
});

describe("chapters", () => {
  test("accepts known chapter switches", () => {
    const c = normalizeConfig({
      ...card,
      chapters: { energi: false, sol: true },
    });
    expect(c.chapters).toEqual({ energi: false, sol: true });
  });

  test("rejects an unknown chapter", () => {
    expect(() =>
      normalizeConfig({ ...card, chapters: { energ: false } }),
    ).toThrow(/chapters\.energ/);
  });

  test("rejects a non-boolean chapter value", () => {
    expect(() =>
      normalizeConfig({ ...card, chapters: { energi: "nej" } }),
    ).toThrow(/chapters\.energi/);
  });
});

describe("signature and validation", () => {
  test("configSignature is stable across key insertion order", () => {
    const a = normalizeConfig({
      ...card,
      quick_actions: [
        {
          label: "Lys",
          action: {
            action: "call-service",
            service: "light.turn_on",
            target: { entity_id: "light.stue" },
          },
        },
      ],
    });
    const b = normalizeConfig({
      quick_actions: [
        {
          action: {
            target: { entity_id: "light.stue" },
            service: "light.turn_on",
            action: "call-service",
          },
          label: "Lys",
        },
      ],
      type: "custom:arcus-card",
    });
    expect(configSignature(a)).toBe(configSignature(b));
  });

  test("configSignature changes with a rendering option", () => {
    const a = normalizeConfig(card);
    const b = normalizeConfig({ ...card, density: "compact" });
    expect(configSignature(a)).not.toBe(configSignature(b));
  });

  test("validateConfig accepts a valid input and rejects an invalid one", () => {
    expect(() => validateConfig(card)).not.toThrow();
    expect(() => validateConfig({ ...card, density: "tiny" })).toThrow(
      /Arcus:/,
    );
  });

  test("throws a readable error for a non-object config", () => {
    expect(() => normalizeConfig("not a config")).toThrow(
      /Arcus: configuration/,
    );
  });
});
