import { afterEach, describe, expect, test } from "vitest";
import type { HistoryCache } from "../src/data/history";
import { createTranslator } from "../src/localize";
import { buildModel } from "../src/model/build";
import type {
  ArcusConfig,
  HassEntity,
  HomeModel,
  SheetRoute,
  Translator,
} from "../src/types";
import type { LayerContext, SheetApp } from "../src/views/layers/types";
import { ArcusSheets, renderSheet } from "../src/views/sheet";
import { makeConfig, makeHass, type MockHass } from "./fixtures/home";

interface TestApp extends SheetApp {
  _model: HomeModel;
  _config: ArcusConfig;
  _t: Translator;
  _n(entityId: string, fallback?: number | null): number | null;
  _get(entityId: string): HassEntity | undefined;
  _on(entityId: string): boolean;
}

function historyStub(): HistoryCache {
  return {
    ensure: async () => undefined,
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
}

function makeApp(
  hass: MockHass,
  model: HomeModel,
  config: ArcusConfig,
): TestApp {
  const t = createTranslator("da");
  return {
    _model: model,
    _config: config,
    _t: t,
    _history: historyStub(),
    _confirm: null,
    _call: () => undefined,
    _closeRoute: () => undefined,
    _refreshConfirm: () => undefined,
    _sheetHeader: (kicker, title, sum) =>
      `<div class="sheet-head"><div class="sheet-kicker">${kicker}</div><h2 class="sheet-title">${title}</h2><div class="sheet-sum">${sum}</div></div>`,
    _sheetTabs: (tabs, active) =>
      `<div class="sheet-tabs">${tabs
        .map(
          (tab) =>
            `<button class="tab ${tab.key === active ? "active" : ""}" data-nav="${
              tab.route
            }">${tab.label}</button>`,
        )
        .join("")}</div>`,
    _n: (entityId, fallback = null) => {
      const state = hass.states[entityId];
      if (!state) return fallback;
      const value = Number(state.state);
      return Number.isFinite(value) ? value : fallback;
    },
    _get: (entityId) => hass.states[entityId],
    _on: (entityId) => {
      const state = hass.states[entityId]?.state;
      return state === "on" || state === "open";
    },
  };
}

interface SheetFixture {
  hass: MockHass;
  config: ArcusConfig;
  model: HomeModel;
  app: TestApp;
  ctx: LayerContext;
}

function fixture(
  overrides: Parameters<typeof makeConfig>[0] = {},
): SheetFixture {
  const hass = makeHass();
  const config = makeConfig(overrides);
  const model = buildModel(hass, config);
  const app = makeApp(hass, model, config);
  return {
    hass,
    config,
    model,
    app,
    ctx: {
      model,
      config,
      t: app._t,
      history: app._history,
      app,
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("sheet layers", () => {
  test("room sheet exposes the thermostat and a light group", () => {
    // The fixture's Stue has no lights of its own (the real groups live in
    // Køkken/Bryggers/Entre), so give it the kitchen group through the room
    // override to exercise the light section on the same room route.
    const { ctx } = fixture({
      rooms: { stue: { lights: ["light.kokken"] } },
    });

    const html = renderSheet({ base: "rum", sub: "stue" }, ctx);

    expect(html).toContain("Stue");
    expect(html).toContain("climate.wavin_stue");
    expect(html).toContain("light.kokken");
    expect(html).toContain('data-range-entity="light.kokken"');
    expect(html).toContain('data-act="temp-step"');
  });

  test("lights sheet contains the master switch and a group", () => {
    const { ctx } = fixture();

    const html = renderSheet({ base: "lys" }, ctx);

    expect(html).toContain('data-act="sluk-alt"');
    expect(html).toContain("data-confirm");
    expect(html).toContain("light.kokken");
    expect(html).toContain("Køkken");
    expect(html).toContain('data-range-entity="light.kokken"');
  });

  test("heating sheet contains a stepper and a zone", () => {
    const { ctx } = fixture();

    const html = renderSheet({ base: "varme" }, ctx);

    expect(html).toContain('data-act="temp-step"');
    expect(html).toContain("climate.wavin_stue");
    expect(html).toContain("Stue");
    expect(html).toContain("climate.wavin_kanal_6");
  });

  test("ventilation sheet contains the Nilan values and five-node airflow", () => {
    const { ctx } = fixture();

    const html = renderSheet({ base: "ventilation" }, ctx);

    expect(html).toContain("NILAN · LUFTVEJ");
    expect(html).toContain("23,2");
    expect(html).toContain("VPL 10 uden køl");
    expect(html).toContain("Skift filter");
    expect(html).toContain('data-act="temp-step"');
    expect(html).toContain('data-act="fan"');
    // Five temperature labels in the airflow: UDE, IND, RUM, AFKAST, UD.
    expect(html.match(/class="flow-val"/g)).toHaveLength(5);
  });

  test("all sheet routes render a body", () => {
    const { ctx } = fixture();
    const bases: Array<Exclude<SheetRoute["base"], "rum">> = [
      "energi",
      "sol",
      "vand",
      "sikkerhed",
      "teknik",
      "oekonomi",
      "alarmer",
      "alle",
      "bon",
      "skur",
    ];

    for (const base of bases) {
      const html = renderSheet({ base }, ctx);
      expect(html).toContain("sheet-scroll");
      expect(html.length).toBeGreaterThan(100);
    }
  });
});

describe("arcus-sheets element", () => {
  test("registers and renders a room", () => {
    expect(customElements.get("arcus-sheets")).toBe(ArcusSheets);

    const { app } = fixture({ rooms: { stue: { lights: ["light.kokken"] } } });
    const el = document.createElement("arcus-sheets") as ArcusSheets;
    el.app = app;
    el.route = { base: "rum", sub: "stue" };
    document.body.appendChild(el);

    expect(el.innerHTML).toContain("Stue");
    expect(el.innerHTML).toContain("climate.wavin_stue");
    expect(el.querySelector(".sheet-scroll")).not.toBeNull();
  });

  test("update re-renders and refreshes the confirm bar", () => {
    const { app } = fixture();
    let refreshes = 0;
    app._refreshConfirm = () => {
      refreshes += 1;
    };

    const el = document.createElement("arcus-sheets") as ArcusSheets;
    el.app = app;
    el.route = { base: "lys" };
    document.body.appendChild(el);

    el.update();

    expect(refreshes).toBe(1);
    expect(el.innerHTML).toContain("light.kokken");
  });

  test("update is skipped while a slider has focus", () => {
    const { app } = fixture();
    let refreshes = 0;
    app._refreshConfirm = () => {
      refreshes += 1;
    };

    const el = document.createElement("arcus-sheets") as ArcusSheets;
    el.app = app;
    el.route = { base: "lys" };
    document.body.appendChild(el);

    const slider = el.querySelector<HTMLInputElement>("input.range");
    expect(slider).not.toBeNull();
    slider!.focus();

    el.update();

    expect(refreshes).toBe(0);
  });
});
