import { describe, expect, test } from "vitest";
import {
  ARCUS_CUSTOM_STRATEGY,
  ARCUS_STRATEGY_TAG,
  ArcusDashboardStrategy,
} from "../src/strategy";
import { makeHass } from "./fixtures/home";

/** A home with no areas, devices, entities, or floors. */
function emptyHome() {
  return makeHass({
    areas: {},
    devices: {},
    entities: {},
    states: {},
    floors: {},
  });
}

describe("ArcusDashboardStrategy", () => {
  test("generates a one-view panel dashboard with the Arcus card", async () => {
    const config = await ArcusDashboardStrategy.generate(
      { type: "custom:arcus", dashboard_title: "Hjem" },
      makeHass(),
    );

    expect(config.title).toBe("Hjem");
    expect(config.views).toHaveLength(1);
    expect(config.views[0].type).toBe("panel");
    expect(config.views[0].path).toBe("hjem");
    expect(config.views[0].title).toBe("Hjem");
    expect(config.views[0].icon).toBe("mdi:weather-sunset");
    expect(config.views[0].cards).toHaveLength(1);
    expect(config.views[0].cards[0]).toMatchObject({
      type: "custom:arcus-card",
    });
  });

  test("keeps and normalizes card overrides", async () => {
    const config = await ArcusDashboardStrategy.generate(
      {
        type: "custom:arcus",
        card: { title: "Mit hjem", density: "compact" },
      },
      makeHass(),
    );

    expect(config.views[0].cards[0]).toMatchObject({
      type: "custom:arcus-card",
      title: "Mit hjem",
      density: "compact",
      language: "auto",
    });
  });

  test("uses the strategy config as the card config when card is absent", async () => {
    const config = await ArcusDashboardStrategy.generate(
      {
        type: "custom:arcus",
        title: "Arcushjem",
        density: "compact",
        areas: ["stue"],
      },
      makeHass(),
    );

    expect(config.title).toBe("Arcushjem");
    expect(config.views[0].cards[0]).toMatchObject({
      type: "custom:arcus-card",
      title: "Arcushjem",
      density: "compact",
      areas: { include: ["stue"], exclude: [], order: [] },
    });
  });

  test("always emits custom:arcus-card even when the card type differs", async () => {
    const config = await ArcusDashboardStrategy.generate(
      {
        type: "custom:arcus",
        view_title: "Hjemme",
        card: { type: "custom:arcus" },
      },
      makeHass(),
    );

    expect(config.views[0].title).toBe("Hjemme");
    expect(config.views[0].cards[0].type).toBe("custom:arcus-card");
  });

  test("getCreateSuggestions suggests Arcus", () => {
    expect(ArcusDashboardStrategy.getCreateSuggestions(makeHass())).toEqual({
      title: "Arcus",
      icon: "mdi:weather-sunset",
    });
  });

  test("getConfigElement returns the strategy editor element", () => {
    expect(ArcusDashboardStrategy.getConfigElement().tagName.toLowerCase()).toBe(
      "arcus-strategy-editor",
    );
  });

  test("registers the custom element and the custom strategy", () => {
    expect(ArcusDashboardStrategy.registryDependencies).toEqual([
      "areas",
      "devices",
      "entities",
      "floors",
    ]);
    expect(customElements.get(ARCUS_STRATEGY_TAG)).toBe(
      ArcusDashboardStrategy,
    );
    expect(new ArcusDashboardStrategy()).toBeInstanceOf(HTMLElement);
    expect(window.customStrategies).toContainEqual(ARCUS_CUSTOM_STRATEGY);
  });

  test("an empty home still returns a valid dashboard", async () => {
    const config = await ArcusDashboardStrategy.generate(
      { type: "custom:arcus" },
      emptyHome(),
    );

    expect(config.title).toBe("Arcus");
    expect(config.views).toHaveLength(1);
    expect(config.views[0]).toMatchObject({
      type: "panel",
      path: "hjem",
      title: "Hjem",
      icon: "mdi:weather-sunset",
    });
    expect(config.views[0].cards).toHaveLength(1);
    expect(config.views[0].cards[0].type).toBe("custom:arcus-card");
  });
});
