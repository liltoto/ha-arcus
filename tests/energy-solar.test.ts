import { describe, expect, test, vi } from "vitest";
import { HistoryCache } from "../src/data/history";
import { createTranslator } from "../src/localize";
import { buildModel } from "../src/model/build";
import { renderEnergySheet } from "../src/views/layers/energy";
import { renderSolarSheet } from "../src/views/layers/solar";
import type {
  ArcusConfig,
  HassEntity,
  HomeModel,
  Translator,
} from "../src/types";
import type { LayerContext, SheetApp } from "../src/views/layers/types";
import { makeConfig, makeHass, type MockHass } from "./fixtures/home";

// The mock home and the price curve are in Europe/Copenhagen. Pin the zone so
// the "today" checks are deterministic on CI, which usually runs in UTC.
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T12:34:00+01:00");

interface TestApp extends SheetApp {
  _n(
    entityId: string | null | undefined,
    fallback?: number | null,
  ): number | null;
  _get(entityId: string | null | undefined): HassEntity | null;
  _now(): Date;
}

function emptyHistory(): HistoryCache {
  return {
    ensure: async () => {},
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
}

function stubApp(
  model: HomeModel,
  config: ArcusConfig,
  t: Translator,
  options: {
    now?: Date;
    history?: HistoryCache;
    hass?: MockHass;
  } = {},
): TestApp {
  const hass = options.hass ?? makeHass();
  const history = options.history ?? emptyHistory();
  const now = options.now ?? NOW;
  return {
    _model: model,
    _config: config,
    _t: t,
    _history: history,
    _call: vi.fn(),
    _closeRoute: vi.fn(),
    _sheetHeader: (kicker, title, sum) =>
      `<div class="sheet-head"><div class="sheet-kicker">${kicker}</div><h2 class="sheet-title">${title}</h2><div class="sheet-sum">${sum}</div></div>`,
    _sheetTabs: (tabs, active) =>
      `<div class="sheet-tabs">${tabs
        .map(
          (tab) =>
            `<button class="tab${
              tab.key === active ? " active" : ""
            }" data-nav="${tab.route}">${tab.label}</button>`,
        )
        .join("")}</div>`,
    _confirm: null,
    _refreshConfirm: vi.fn(),
    _n: (entityId, fallback = null) => {
      const state = entityId ? hass.states[entityId] : undefined;
      if (!state) return fallback;
      const value = Number(state.state);
      return Number.isFinite(value) ? value : fallback;
    },
    _get: (entityId) => (entityId ? (hass.states[entityId] ?? null) : null),
    _now: () => now,
  };
}

function context(
  model: HomeModel,
  options: {
    now?: Date;
    history?: HistoryCache;
    config?: ArcusConfig;
    hass?: MockHass;
  } = {},
): LayerContext {
  const config = options.config ?? makeConfig();
  const t = createTranslator("da");
  const app = stubApp(model, config, t, options);
  return { model, config, t, history: app._history, app };
}

describe("energy sheet", () => {
  test("shows the current price, price bars, and the cheapest window", () => {
    const model = buildModel(makeHass(), makeConfig(), NOW);
    const html = renderEnergySheet(context(model));

    expect(html).toContain("Energi");
    expect(html).toContain("1,75");
    expect(html).toContain("Døgnets priser");
    expect(html).toContain("Billigste 3 timer");
    expect(html).toContain("billigst 12–15");
    expect(html).toContain("kl. 12–15");
    expect(html).toContain('class="bar-chart"');
    expect(html).toContain('data-nav="sol"');
  });

  test("falls back to the energy alias and stays calm without price data", () => {
    const base = buildModel(makeHass(), makeConfig(), NOW);
    const alias = { ...base, price: undefined, energy: base.price };
    expect(renderEnergySheet(context(alias))).toContain("1,75");

    const empty = renderEnergySheet(
      context({ ...base, price: undefined, energy: undefined }),
    );
    expect(empty).toContain("Energi");
    expect(empty).toContain("Ingen data");
  });

  test("keeps today's price at 23:59 local time", () => {
    const late = new Date("2026-11-13T23:59:00+01:00");
    const model = buildModel(makeHass(), makeConfig(), late);
    const html = renderEnergySheet(context(model, { now: late }));

    expect(html).toContain("1,75");
    expect(html).toContain("Døgnets priser");
  });
});

describe("solar sheet", () => {
  test("renders all five tabs and the overview", () => {
    const model = buildModel(makeHass(), makeConfig(), NOW);
    const html = renderSolarSheet(context(model));

    expect(html).toContain("Solceller");
    for (const label of [
      "Overblik",
      "Produktion",
      "Batteri",
      "Prognose",
      "Afkast",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Energi-flow");
    expect(html).toContain('data-chart="solar-24h"');
    expect(html).toContain("Helios");
  });

  test("renders each solar tab body", () => {
    const model = buildModel(makeHass(), makeConfig(), NOW);
    const ctx = context(model);

    expect(renderSolarSheet(ctx, "produktion")).toContain(
      "Produktion mod prognose",
    );
    expect(renderSolarSheet(ctx, "batteri")).toContain("Ladning · 7 dage");
    expect(renderSolarSheet(ctx, "prognose")).toContain("Prognose · 48 timer");
    expect(renderSolarSheet(ctx, "afkast")).toContain(
      "Hvornår er det tilbagebetalt?",
    );
  });

  test("shows a calm empty state without solar data", () => {
    const model = {
      ...buildModel(makeHass(), makeConfig(), NOW),
      solar: undefined,
    };
    const html = renderSolarSheet(context(model));

    expect(html).toContain("Solceller");
    expect(html).toContain("Ingen solcelledata");
    expect(html).not.toContain('class="sheet-tabs"');
  });

  test("omits the Helios link when no path is configured", () => {
    const config = makeConfig();
    delete config.solar!.heliosPath;
    const model = buildModel(makeHass(), config, NOW);
    const html = renderSolarSheet(context(model, { config }));

    expect(html).not.toContain("Helios");
  });

  test("renders a missing battery without crashing", () => {
    const base = buildModel(makeHass(), makeConfig(), NOW);
    const solar = {
      ...base.solar!,
      batterySoc: null,
      batteryPower: null,
      batteryTemperature: null,
      batteryVoltage: null,
      batteryCurrent: null,
      batteryCharge: null,
      batteryDischarge: null,
      batteryMinSoc: null,
      batteryMaxSoc: null,
    };
    const html = renderSolarSheet(context({ ...base, solar }), "batteri");

    expect(html).toContain("Batteri");
    expect(html).toContain("–");
    expect(html).toContain('data-chart="solar-soc-7d"');
  });

  test("uses history for the seven-day battery and production charts", async () => {
    const hass = makeHass();
    const config = makeConfig();
    const history = new HistoryCache(hass, () => NOW);
    await history.ensure(
      [
        config.solar!.batterySoc!,
        config.solar!.batteryCharge!,
        config.solar!.batteryDischarge!,
        config.solar!.today!,
        config.solar!.power!,
        config.solar!.pv3!,
        config.solar!.pv4!,
      ],
      24 * 7,
    );
    const model = buildModel(hass, config, NOW);

    const battery = renderSolarSheet(
      context(model, { history, config, hass }),
      "batteri",
    );
    expect(battery).toContain('data-chart="solar-soc-7d"');
    expect(battery).toContain(`data-chart-line="${config.solar!.batterySoc!}"`);
    expect(battery).toMatch(/data-chart-line="[^"]+"[^>]*d="M/);

    const production = renderSolarSheet(
      context(model, { history, config, hass }),
      "produktion",
    );
    expect(production).toContain('data-bars="solarWeek"');
    expect(production).not.toContain("day-empty");
    expect(production).toContain(
      `data-chart-line="24:${config.solar!.power!}"`,
    );
    expect(production).toMatch(/data-chart-line="24:[^"]+"[^>]*d="M/);
  });

  test("filters the 24-hour forecast to the current local day at 23:59", () => {
    const late = new Date("2026-11-13T23:59:00+01:00");
    const model = buildModel(makeHass(), makeConfig(), late);
    const html = renderSolarSheet(context(model, { now: late }));

    expect(html).toContain("15,3");
    expect(html).toMatch(/data-chart="solar-24h" data-points="96"/);

    const forecast = renderSolarSheet(
      context(model, { now: late }),
      "prognose",
    );
    expect(forecast).toMatch(/data-chart="solar-48h" data-points="192"/);
  });
});
