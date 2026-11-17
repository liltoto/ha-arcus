import type { Decorator } from "@storybook/react";
import { createTranslator } from "../../localize";
import { buildBindings } from "../../model/bindings";
import { buildModel } from "../../model/build";
import { defaultRange, resolveRange } from "../../range";
import type { ArcusActions, ArcusRoute, ArcusStoreState } from "../types";
import type { HistoryCache } from "../../data/history";
import { makeConfig, makeHass } from "../../../tests/fixtures/home";
import { ArcusProvider } from "./ArcusProvider";
import { createArcusStore } from "./store";

const now = () => new Date("2026-11-13T01:19:00+01:00");
const hass = makeHass();
const config = makeConfig();
const model = buildModel(hass, config, now());
const t = createTranslator("da");

const actions: ArcusActions = {
  callService: () => undefined,
  navigate: () => undefined,
  openSheet: () => undefined,
  closeSheet: () => undefined,
  performAction: () => undefined,
  toast: () => undefined,
  setAtmo: () => undefined,
  setHistoryRange: () => undefined,
};

const history = {
  ensure: async () => undefined,
  series: () => [],
  window: () => [],
  raw: () => [],
  status: () => "empty",
} as unknown as HistoryCache;

const providerState: ArcusStoreState = {
  hass,
  config,
  model,
  t,
  bindings: {
    ...buildBindings(model, config, t),
    date: "13. november 2026",
    clock: "01:19",
    heroDate: "Fredag · kl. 01:19",
    eyebrow: "NÆSTE BØN · Fajr 05:12",
    greet: "Godnat, <em>Liltoto</em>",
    person: "hjemme",
    personHome: "1",
    weatherTemp: "7°",
    weatherSub: "Let skyet",
    weatherStrip: "",
    version: "0.2.0",
    roomsMeta: "<b>7 rum</b> · 0 åbne · 0 lys tændt",
  },
  route: { base: "hjem", sub: null } as ArcusRoute,
  actions,
  history,
  now,
  range: resolveRange(defaultRange(now()), now()),
  atmo: "night",
  atmoMode: "night",
  dark: true,
};

const store = createArcusStore(providerState);

/**
 * Supplies the real home fixture to organism stories. Atoms and molecules
 * ignore the context; pages and organisms can be reviewed with real data.
 */
export const withArcusFixture: Decorator = (Story) => (
  <ArcusProvider store={store}>
    <Story />
  </ArcusProvider>
);
