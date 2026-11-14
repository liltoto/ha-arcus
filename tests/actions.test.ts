import { afterEach, describe, expect, test, vi } from "vitest";
import { firstEntity, performAction } from "../src/actions";
import type { ActionConfig } from "../src/types";
import { makeHass, type MockHass } from "./fixtures/home";

function spyOnOpen() {
  return vi.spyOn(window, "open").mockImplementation(() => null);
}

function callServiceSpy(hass: MockHass) {
  return vi.spyOn(hass, "callService").mockResolvedValue(undefined);
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("performAction url", () => {
  test("opens an absolute https URL with the target and noopener,noreferrer", async () => {
    const open = spyOnOpen();

    await performAction(makeHass(), {
      action: "url",
      url_path: "https://example.com",
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("accepts an upper-case scheme", async () => {
    const open = spyOnOpen();

    await performAction(makeHass(), {
      action: "url",
      url_path: "HTTPS://EXAMPLE.COM",
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      "HTTPS://EXAMPLE.COM",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example",
    "example.com",
  ])("does not open %s", async (url) => {
    const open = spyOnOpen();

    await performAction(makeHass(), { action: "url", url_path: url });

    expect(open).not.toHaveBeenCalled();
  });
});

describe("performAction perform-action", () => {
  test("dispatches the service with data and the target entity", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "perform-action",
      perform_action: "light.turn_on",
      data: { brightness: 200 },
      target: { entity_id: "light.kokken" },
    });

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith(
      "light",
      "turn_on",
      { brightness: 200 },
      { entity_id: "light.kokken" },
    );
  });

  test("targets a top-level entity and defaults data to {}", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "perform-action",
      perform_action: "light.turn_off",
      entity_id: "light.stue",
    });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "turn_off",
      {},
      { entity_id: "light.stue" },
    );
  });

  test("falls back to data.entity_id for the target", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "perform-action",
      perform_action: "light.turn_on",
      data: { entity_id: "light.kontor", brightness: 80 },
    });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "turn_on",
      { entity_id: "light.kontor", brightness: 80 },
      { entity_id: "light.kontor" },
    );
  });

  test("uses the first non-empty entity from an array", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "perform-action",
      perform_action: "light.turn_on",
      entity_id: ["", "  ", "light.entre", "light.stue"],
    });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "turn_on",
      {},
      { entity_id: "light.entre" },
    );
  });

  test("infers perform-action from perform_action alone", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      perform_action: "input_button.press",
      target: { entity_id: "input_button.bedtime" },
    });

    expect(callService).toHaveBeenCalledWith(
      "input_button",
      "press",
      {},
      { entity_id: "input_button.bedtime" },
    );
  });

  test("rejects a missing service", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await expect(
      performAction(hass, { action: "perform-action" }),
    ).rejects.toThrow("Invalid service: (missing)");
    expect(callService).not.toHaveBeenCalled();
  });

  test.each(["light", "light."])(
    "rejects the malformed service %s",
    async (service) => {
      const hass = makeHass();
      const callService = callServiceSpy(hass);

      await expect(
        performAction(hass, {
          action: "perform-action",
          perform_action: service,
        }),
      ).rejects.toThrow("Invalid service");
      expect(callService).not.toHaveBeenCalled();
    },
  );
});

describe("performAction call-service", () => {
  test("dispatches the service with data and target", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "call-service",
      service: "climate.set_temperature",
      data: { temperature: 21 },
      target: { entity_id: "climate.stue" },
    });

    expect(callService).toHaveBeenCalledWith(
      "climate",
      "set_temperature",
      { temperature: 21 },
      { entity_id: "climate.stue" },
    );
  });

  test("infers call-service and defaults data to {}", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      service: "light.turn_off",
      entity_id: "light.stue",
    });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "turn_off",
      {},
      { entity_id: "light.stue" },
    );
  });

  test("rejects a missing service", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await expect(
      performAction(hass, { action: "call-service" }),
    ).rejects.toThrow("Invalid service: (missing)");
    expect(callService).not.toHaveBeenCalled();
  });
});

describe("performAction toggle", () => {
  test("derives the domain from the entity id", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "toggle",
      entity_id: "light.kokken",
    });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "toggle",
      {},
      { entity_id: "light.kokken" },
    );
  });

  test("honours an explicit target object", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);
    const target = { entity_id: "switch.kontor" };

    await performAction(hass, {
      action: "toggle",
      entity_id: "light.stue",
      target,
    });

    expect(callService).toHaveBeenCalledWith("switch", "toggle", {}, target);
  });

  test("rejects when no entity is present", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await expect(
      performAction(hass, { action: "toggle", entity_id: ["", "  "] }),
    ).rejects.toThrow("A toggle action needs an entity.");
    expect(callService).not.toHaveBeenCalled();
  });
});

describe("performAction navigate", () => {
  test("sets the hash for a fragment path", async () => {
    await performAction(makeHass(), {
      action: "navigate",
      navigation_path: "#indstillinger",
    });

    expect(location.hash).toBe("#indstillinger");
    expect(location.pathname).toBe("/");
  });

  test("pushes an absolute path and emits location-changed", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const changed = vi.fn();
    window.addEventListener("location-changed", changed);

    await performAction(makeHass(), {
      action: "navigate",
      navigation_path: "/map",
    });

    window.removeEventListener("location-changed", changed);
    expect(pushState).toHaveBeenCalledWith(null, "", "/map");
    expect(location.pathname).toBe("/map");
    expect(changed).toHaveBeenCalledTimes(1);
  });

  test("prefixes a relative path with #/", async () => {
    await performAction(makeHass(), {
      action: "navigate",
      navigation_path: "lys",
    });

    expect(location.hash).toBe("#/lys");
  });

  test("falls back to url_path", async () => {
    await performAction(makeHass(), {
      action: "navigate",
      url_path: "#/energi",
    });

    expect(location.hash).toBe("#/energi");
  });

  test("ignores an empty path", async () => {
    const pushState = vi.spyOn(window.history, "pushState");

    await performAction(makeHass(), {
      action: "navigate",
      navigation_path: "   ",
    });

    expect(pushState).not.toHaveBeenCalled();
    expect(location.hash).toBe("");
    expect(location.pathname).toBe("/");
  });

  test("falls back to the hash when pushState throws", async () => {
    const pushState = vi
      .spyOn(window.history, "pushState")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const changed = vi.fn();
    window.addEventListener("location-changed", changed);

    await performAction(makeHass(), {
      action: "navigate",
      navigation_path: "/map",
    });

    window.removeEventListener("location-changed", changed);
    expect(pushState).toHaveBeenCalledWith(null, "", "/map");
    expect(location.hash).toBe("#/map");
    expect(changed).toHaveBeenCalledTimes(1);
  });
});

describe("performAction fallbacks", () => {
  test("rejects an unknown action kind", async () => {
    await expect(
      performAction(makeHass(), { action: "explode" }),
    ).rejects.toThrow("Unsupported action: explode");
  });

  test("rejects an action without a kind", async () => {
    await expect(performAction(makeHass(), {})).rejects.toThrow(
      "Unsupported action: unknown",
    );
  });

  test("dispatches a service when the kind is unknown", async () => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, {
      action: "not-a-kind",
      service: "light.turn_on",
      entity_id: "light.stue",
    });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "turn_on",
      {},
      { entity_id: "light.stue" },
    );
  });

  test.each([null, undefined])("ignores a %s action", async (action) => {
    const hass = makeHass();
    const callService = callServiceSpy(hass);

    await performAction(hass, action as unknown as ActionConfig);

    expect(callService).not.toHaveBeenCalled();
  });
});

describe("firstEntity", () => {
  test("prefers the target entity over the top-level entity", () => {
    expect(
      firstEntity({
        target: { entity_id: "light.kokken" },
        entity_id: "light.stue",
        data: { entity_id: "light.kontor" },
      }),
    ).toBe("light.kokken");
  });

  test("falls back to the top-level entity before data", () => {
    expect(
      firstEntity({
        entity_id: "light.stue",
        data: { entity_id: "light.kontor" },
      }),
    ).toBe("light.stue");
  });

  test("reads data.entity_id when nothing else is set", () => {
    expect(firstEntity({ data: { entity_id: "light.kontor" } })).toBe(
      "light.kontor",
    );
  });

  test("picks the first non-empty string from an array", () => {
    expect(
      firstEntity({
        target: { entity_id: ["", "  ", "light.entre", "light.stue"] },
      }),
    ).toBe("light.entre");
  });

  test("skips blank candidates and trims the result", () => {
    expect(
      firstEntity({
        target: { entity_id: "  " },
        entity_id: ["", "  "],
        data: { entity_id: " light.entre " },
      }),
    ).toBe("light.entre");
  });

  test("returns undefined without an entity", () => {
    expect(firstEntity({})).toBeUndefined();
    expect(firstEntity({ target: { entity_id: [] } })).toBeUndefined();
  });
});
