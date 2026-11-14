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
import type { ArcusActions, ArcusRoute } from "../../src/ui/types";
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
  /**
   * Card-level bindings that are not part of `buildBindings` (the hero copy,
   * for example). They are merged over the generated map.
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
    confirm: vi.fn(),
    toast: vi.fn(),
    setAtmo: vi.fn(),
  };
}

export function historyStub(): HistoryCache {
  return {
    ensure: async () => undefined,
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
}

export function makeArcusProps(options: ArcusRenderOptions = {}) {
  const hass = options.hass ?? makeHass();
  const config = options.config ?? makeConfig();
  const now =
    options.now ?? (() => new Date("2026-11-13T01:19:00+01:00"));
  const model = options.model ?? buildModel(hass, config, now());
  const t: Translator = createTranslator("da");
  const bindings = {
    ...buildBindings(model, config, t),
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
    history: historyStub(),
    now,
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
): RenderResult & { props: ReturnType<typeof makeArcusProps> } {
  const props = makeArcusProps(options);
  const result = render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ArcusProvider {...props}>{children}</ArcusProvider>
    ),
    ...renderOptions,
  });
  return { ...result, props };
}
