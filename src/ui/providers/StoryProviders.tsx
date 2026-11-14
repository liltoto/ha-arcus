import type { Decorator } from "@storybook/react";
import { createTranslator } from "../../localize";
import { buildBindings } from "../../model/bindings";
import { buildModel } from "../../model/build";
import type { ArcusActions, ArcusProviderProps, ArcusRoute } from "../types";
import type { HistoryCache } from "../../data/history";
import { makeConfig, makeHass } from "../../../tests/fixtures/home";
import { ArcusProvider } from "./ArcusProvider";

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
  confirm: () => undefined,
  toast: () => undefined,
  setAtmo: () => undefined,
};

const history = {
  ensure: async () => undefined,
  series: () => [],
  window: () => [],
  raw: () => [],
} as unknown as HistoryCache;

const providerProps: Omit<ArcusProviderProps, "children"> = {
  hass,
  config,
  model,
  t,
  bindings: buildBindings(model, config, t),
  route: { base: "hjem", sub: null } as ArcusRoute,
  actions,
  history,
  now,
};

/**
 * Supplies the real home fixture to organism stories. Atoms and molecules
 * ignore the context; pages and organisms can be reviewed with real data.
 */
export const withArcusFixture: Decorator = (Story) => (
  <ArcusProvider {...providerProps}>
    <Story />
  </ArcusProvider>
);
