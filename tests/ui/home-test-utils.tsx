import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import type { HistoryCache } from "../../src/data/history";
import { createTranslator } from "../../src/localize";
import { buildBindings } from "../../src/model/bindings";
import { buildModel } from "../../src/model/build";
import { ArcusProvider } from "../../src/ui/providers/ArcusProvider";
import { createArcusStore } from "../../src/ui/providers/store";
import type { ArcusActions, ArcusRoute, ArcusStore } from "../../src/ui/types";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Translator,
} from "../../src/types";
import { makeConfig, makeHass } from "../fixtures/home";

export interface ArcusRenderOptions {
  hass?: ArcusHass;
  config?: ArcusConfig;
  model?: HomeModel;
  route?: ArcusRoute;
  now?: () => Date;
  history?: HistoryCache;
  /**
   * Card-level bindings that are not part of `buildBindings` (the hero copy,
   * date, person, clock, and version). They are merged over the generated map.
   */
  bindings?: Record<string, string>;
}

export function makeActions(): ArcusActions {
  return {
    callService: vi.fn(),
    navigate: vi.fn(),
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
    performAction: vi.fn(),
    toast: vi.fn(),
    setAtmo: vi.fn(),
  };
}

function historyStub(): HistoryCache {
  return {
    ensure: async () => undefined,
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
}

/**
 * Mirror the card's `_personId`/`_personState` resolution so presence-dependent
 * organisms see the same `personHome` binding the card publishes. TopBar reads
 * the binding instead of scanning `hass.states` itself.
 */
function personHomeBinding(hass: ArcusHass, config: ArcusConfig): string {
  const states = hass.states ?? {};
  const configured = config.person?.trim();
  const ids = Object.keys(states).filter((id) => id.startsWith("person."));
  const id =
    configured && states[configured]
      ? configured
      : (ids.find((entityId) => states[entityId]?.state === "home") ?? ids[0]);
  return id && states[id]?.state === "home" ? "1" : "0";
}

export function makeArcusProps(options: ArcusRenderOptions = {}) {
  const hass = options.hass ?? makeHass();
  const config = options.config ?? makeConfig();
  const now = options.now ?? (() => new Date("2026-11-13T01:19:00+01:00"));
  const model = options.model ?? buildModel(hass, config, now());
  const t: Translator = createTranslator("da");
  const bindings: Record<string, string> = {
    ...buildBindings(model, config, t),
    personHome: personHomeBinding(hass, config),
    ...options.bindings,
  };

  return {
    hass,
    config,
    model,
    t,
    bindings,
    route: options.route ?? { base: "hjem", sub: null },
    actions: makeActions(),
    history: options.history ?? historyStub(),
    now,
    atmo: "night" as const,
    atmoMode: "auto" as const,
    dark: true,
  };
}

/**
 * Render one home organism with the real fixture and a fresh action bridge.
 * Every Wave 3 test uses this instead of hand-building provider props.
 */
export function renderWithArcus(
  ui: ReactElement,
  options: ArcusRenderOptions = {},
  renderOptions: Omit<RenderOptions, "wrapper"> = {},
): RenderResult & {
  props: ReturnType<typeof makeArcusProps>;
  store: ArcusStore;
} {
  const props = makeArcusProps(options);
  const store = createArcusStore(props);
  const result = render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ArcusProvider store={store}>{children}</ArcusProvider>
    ),
    ...renderOptions,
  });
  return { ...result, props, store };
}
