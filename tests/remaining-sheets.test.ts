import { describe, expect, test } from "vitest";
import { HistoryCache } from "../src/data/history";
import { createTranslator } from "../src/localize";
import { buildModel } from "../src/model/build";
import type { ArcusConfig, HomeModel, Translator } from "../src/types";
import { renderAlertsSheet } from "../src/views/layers/alerts";
import { renderAllSheet } from "../src/views/layers/all";
import { renderEconomySheet } from "../src/views/layers/economy";
import { renderPrayersSheet } from "../src/views/layers/prayers";
import { renderSecuritySheet } from "../src/views/layers/security";
import { renderTechSheet } from "../src/views/layers/tech";
import { renderWaterSheet } from "../src/views/layers/water";
import type { LayerContext, SheetApp } from "../src/views/layers/types";
import { makeConfig, makeHass, type MockHass } from "./fixtures/home";

const NOW = new Date("2026-11-13T12:00:00Z");

interface StubApp extends SheetApp {
  _on: (entityId: string) => boolean;
  _get: (entityId: string) => {
    state?: string;
    attributes?: Record<string, any>;
  } | null;
  _n: (entityId: string, fallback?: number | null) => number | null;
}

function makeApp(
  model: HomeModel,
  config: ArcusConfig,
  hass: MockHass,
  t: Translator,
): StubApp {
  return {
    _model: model,
    _config: config,
    _t: t,
    _history: new HistoryCache(hass, () => NOW),
    _call() {},
    _closeRoute() {},
    _sheetHeader(kicker, title, summary) {
      return `<header class="sheet-head"><div class="eyebrow">${kicker}</div><h2>${title}</h2><p>${summary}</p></header>`;
    },
    _sheetTabs() {
      return "";
    },
    _confirm: null,
    _refreshConfirm() {},
    _on(entityId) {
      const state = hass.states[entityId]?.state;
      return state === "on" || state === "open";
    },
    _get(entityId) {
      return hass.states[entityId] ?? null;
    },
    _n(entityId, fallback = null) {
      const value = Number(hass.states[entityId]?.state);
      return Number.isFinite(value) ? value : fallback;
    },
  };
}

function makeContext(
  model: HomeModel,
  config: ArcusConfig,
  hass: MockHass,
): LayerContext {
  const t = createTranslator("da");
  const app = makeApp(model, config, hass, t);
  return {
    model,
    config,
    t,
    history: app._history,
    app,
  };
}

describe("remaining Arcus sheets", () => {
  test("water, security, tech, economy, prayers, alerts and all render without their data", () => {
    const hass = makeHass();
    const config = makeConfig();
    const base = buildModel(hass, config, NOW);
    const empty: HomeModel = {
      ...base,
      rooms: [],
      roomStats: {},
      water: undefined,
      security: undefined,
      tech: undefined,
      economy: undefined,
      prayers: undefined,
      alerts: [],
    };
    const ctx = makeContext(empty, config, hass);

    const cases: Array<[string, string]> = [
      [renderWaterSheet(ctx), "Vand"],
      [renderSecuritySheet(ctx), "Sikkerhed"],
      [renderTechSheet(ctx), "Teknik"],
      [renderEconomySheet(ctx), "Økonomi"],
      [renderPrayersSheet(ctx), "Bedetider"],
      [renderAlertsSheet(ctx), "Alarmer"],
      [renderAllSheet(ctx), "Alle lag"],
    ];

    for (const [html, title] of cases) {
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(title);
    }
  });

  test("security shows the open door and the water leak", () => {
    const hass = makeHass();
    const door = "binary_sensor.myggbett_door_window_sensor_dor_7";
    const leak = "binary_sensor.klippbok_water_leak_sensor_water_leak";
    hass.states[door] = { ...hass.states[door], state: "on" };
    hass.states[leak] = { ...hass.states[leak], state: "on" };

    const config = makeConfig();
    const model = buildModel(hass, config, NOW);
    expect(model.security?.open).toBeGreaterThan(0);
    expect(model.security?.leak).toBe(true);

    const html = renderSecuritySheet(makeContext(model, config, hass));
    expect(html).toContain("ÅBEN");
    expect(html).toContain("ALARM");
    expect(html).toContain("vandlækage");
    expect(html).toContain("data-open=");
    expect(html).toContain("data-batt=");
    expect(html).toContain("data-nav=");
  });

  test("prayers highlight the next prayer", () => {
    const hass = makeHass();
    const config = makeConfig();
    const model = buildModel(hass, config, NOW);
    const next = model.prayers?.next;
    expect(next).toBeTruthy();

    const html = renderPrayersSheet(makeContext(model, config, hass));
    expect(html).toContain(next!.name);
    expect(html).toContain("NÆSTE");
    expect(html).toContain("Dagens fem bønner");
  });

  test("alerts are ordered by severity", () => {
    const hass = makeHass();
    const config = makeConfig();
    const base = buildModel(hass, config, NOW);
    const model: HomeModel = {
      ...base,
      alerts: [
        {
          sev: 1,
          key: "info",
          title: "Info ting",
          text: "Info tekst",
          route: "teknik",
        },
        {
          sev: 3,
          key: "critical",
          title: "Kritisk ting",
          text: "Kritisk tekst",
          route: "vand",
        },
        {
          sev: 2,
          key: "warning",
          title: "Advarsel ting",
          text: "Advarsel tekst",
          route: "sikkerhed",
        },
      ],
    };

    const html = renderAlertsSheet(makeContext(model, config, hass));
    expect(html).toContain("KRITISK");
    expect(html).toContain("ADVARSEL");
    expect(html).toContain("INFO");
    expect(html.indexOf("Kritisk ting")).toBeLessThan(
      html.indexOf("Advarsel ting"),
    );
    expect(html.indexOf("Advarsel ting")).toBeLessThan(
      html.indexOf("Info ting"),
    );
    expect(html).toContain('data-nav="vand"');
  });

  test("all layers shows the model rooms and the chapter routes", () => {
    const hass = makeHass();
    const config = makeConfig();
    const model = buildModel(hass, config, NOW);
    const html = renderAllSheet(makeContext(model, config, hass));

    expect(html).toContain("Stue");
    expect(html).toContain("Køkken");
    expect(html).toContain('data-nav="rum/stue"');
    expect(html).toContain('data-nav="bon"');
    expect(html).toContain('data-nav="vand"');
    expect(html).toContain('data-nav="sikkerhed"');
    expect(html).toContain('data-nav="teknik"');
    expect(html).toContain('data-nav="oekonomi"');
    expect(html).toContain('data-nav="alarmer"');
  });

  test("tech and economy render chart paths from the history cache", () => {
    const hass = makeHass();
    const config = makeConfig();
    const model = buildModel(hass, config, NOW);
    const ctx = makeContext(model, config, hass);
    const fakeHistory = {
      series: () => [1, 2, 3, 2, 1],
      window: () => [96.8, 97.1, 97.4, 97.2],
    } as unknown as HistoryCache;
    const chartCtx: LayerContext = { ...ctx, history: fakeHistory };

    const tech = renderTechSheet(chartCtx);
    const economy = renderEconomySheet(chartCtx);
    expect(tech).toContain("Netværkets puls · 6 timer");
    expect(tech).toMatch(/d="M/);
    expect(economy).toContain("Kursudvikling · 30 dage");
    expect(economy).toMatch(/d="M/);
  });
});
