import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ArcusCard } from "../../src/card";
import type { HistoryCache } from "../../src/data/history";
import { createTranslator } from "../../src/localize";
import { buildModel } from "../../src/model/build";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Translator,
} from "../../src/types";
import {
  ArcusProvider,
  useActions,
  useArcusStore,
  useConfig,
  useHass,
} from "../../src/ui/providers/ArcusProvider";
import { createArcusStore } from "../../src/ui/providers/store";
import {
  useBindings,
  useHistory,
  useModel,
  useNow,
  useRoute,
  useTranslator,
} from "../../src/ui/hooks";
import type {
  ArcusActions,
  ArcusRoute,
  ArcusStoreState,
} from "../../src/ui/types";
import { defaultRange, resolveRange } from "../../src/range";
import { makeConfig, makeHass } from "../fixtures/home";

/** The sheet tests use the same minimal cache; the provider only forwards it. */
const historyStub = (): HistoryCache => {
  return {
    ensure: async () => undefined,
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
};

const actionsStub = (): ArcusActions => {
  return {
    callService: vi.fn(),
    navigate: vi.fn(),
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
    performAction: vi.fn(),
    toast: vi.fn(),
    setAtmo: vi.fn(),
    setHistoryRange: vi.fn(),
  };
};

const providerState = (
  overrides: Partial<ArcusStoreState> = {},
): ArcusStoreState => {
  const hass = overrides.hass ?? makeHass();
  const config = overrides.config ?? makeConfig();
  return {
    hass,
    model: overrides.model ?? buildModel(hass, config),
    config,
    t: createTranslator("da"),
    bindings: { hero: "Godaften" },
    route: { base: "energi", sub: null },
    actions: actionsStub(),
    history: historyStub(),
    now: () => new Date("2026-11-13T01:19:00+01:00"),
    range: resolveRange(
      defaultRange(new Date("2026-11-13T01:19:00+01:00")),
      new Date("2026-11-13T01:19:00+01:00"),
    ),
    atmo: "night",
    atmoMode: "night",
    dark: true,
    ...overrides,
  };
};

interface Snapshot {
  hass: ArcusHass;
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  bindings: Record<string, string>;
  route: ArcusRoute;
  actions: ArcusActions;
  history: HistoryCache;
  now: () => Date;
}

interface ProbeProps {
  label: string;
  onRender?: (snapshot: Snapshot) => void;
}

const Probe = ({ label, onRender }: ProbeProps) => {
  const snapshot: Snapshot = {
    hass: useHass(),
    model: useModel(),
    config: useConfig(),
    t: useTranslator(),
    bindings: useBindings(),
    route: useRoute(),
    actions: useActions(),
    history: useHistory(),
    now: useNow(),
  };
  onRender?.(snapshot);

  return (
    <div>
      <span data-testid={`${label}-title`}>{snapshot.config.title}</span>
      <span data-testid={`${label}-room`}>{snapshot.model.rooms[0]?.name}</span>
      <span data-testid={`${label}-route`}>{snapshot.route.base}</span>
      <span data-testid={`${label}-state`}>
        {snapshot.hass.states["climate.wavin_stue"]?.state ?? "missing"}
      </span>
      <span data-testid={`${label}-binding`}>{snapshot.bindings.hero}</span>
      <button
        data-testid={`${label}-navigate`}
        onClick={() => snapshot.actions.navigate("rum/stue")}
      >
        Navigate
      </button>
    </div>
  );
};

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("ArcusProvider", () => {
  test("two providers keep their own config, state and actions", () => {
    const actionsA = actionsStub();
    const actionsB = actionsStub();
    const storeA = createArcusStore(
      providerState({
        config: makeConfig({ title: "Hjem A" }),
        actions: actionsA,
      }),
    );
    const storeB = createArcusStore(
      providerState({
        config: makeConfig({ title: "Hjem B" }),
        actions: actionsB,
      }),
    );

    render(
      <>
        <ArcusProvider store={storeA}>
          <Probe label="a" />
        </ArcusProvider>
        <ArcusProvider store={storeB}>
          <Probe label="b" />
        </ArcusProvider>
      </>,
    );

    expect(screen.getByTestId("a-title")).toHaveTextContent("Hjem A");
    expect(screen.getByTestId("b-title")).toHaveTextContent("Hjem B");
    expect(screen.getByTestId("a-route")).toHaveTextContent("energi");

    fireEvent.click(screen.getByTestId("a-navigate"));

    expect(actionsA.navigate).toHaveBeenCalledWith("rum/stue");
    expect(actionsB.navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("b-navigate"));

    expect(actionsB.navigate).toHaveBeenCalledWith("rum/stue");
    expect(actionsA.navigate).toHaveBeenCalledTimes(1);
  });

  test("a state-only hass update reaches consumers and keeps stable values", () => {
    const state = providerState();
    const store = createArcusStore(state);
    const seen: Snapshot[] = [];
    const onRender = (snapshot: Snapshot) => seen.push(snapshot);

    render(
      <ArcusProvider store={store}>
        <Probe label="one" onRender={onRender} />
      </ArcusProvider>,
    );

    const first = seen.at(-1)!;
    const nextHass: ArcusHass = {
      ...state.hass,
      states: {
        ...state.hass.states,
        "climate.wavin_stue": {
          ...state.hass.states["climate.wavin_stue"],
          state: "off",
        },
      },
    };

    act(() => store.setState({ hass: nextHass }));

    const latest = seen.at(-1)!;
    expect(latest.hass).toBe(nextHass);
    expect(screen.getByTestId("one-state")).toHaveTextContent("off");

    // Every value not in the update keeps its identity.
    expect(latest.model).toBe(first.model);
    expect(latest.config).toBe(first.config);
    expect(latest.t).toBe(first.t);
    expect(latest.bindings).toBe(first.bindings);
    expect(latest.route).toBe(first.route);
    expect(latest.actions).toBe(first.actions);
    expect(latest.history).toBe(first.history);
    expect(latest.now).toBe(first.now);
  });

  test("a hass update leaves slice-only consumers alone", () => {
    const store = createArcusStore(providerState());
    const hassRenders = vi.fn();
    const configRenders = vi.fn();

    const HassProbe = () => {
      useHass();
      hassRenders();
      return null;
    };

    const ConfigProbe = () => {
      useConfig();
      configRenders();
      return null;
    };

    render(
      <ArcusProvider store={store}>
        <HassProbe />
        <ConfigProbe />
      </ArcusProvider>,
    );

    hassRenders.mockClear();
    configRenders.mockClear();

    act(() =>
      store.setState({
        hass: {
          ...store.getState().hass,
          states: {
            ...store.getState().hass.states,
            "sensor.stue_temperature": {
              ...store.getState().hass.states["sensor.stue_temperature"],
              state: "19.5",
            },
          },
        },
      }),
    );

    expect(hassRenders).toHaveBeenCalled();
    expect(configRenders).not.toHaveBeenCalled();
  });

  test("exposes the store instance for advanced selectors", () => {
    const store = createArcusStore(providerState());

    const StoreProbe = () => {
      expect(useArcusStore()).toBe(store);
      return null;
    };

    render(
      <ArcusProvider store={store}>
        <StoreProbe />
      </ArcusProvider>,
    );
  });

  test("hooks throw a clear error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Probe label="orphan" />)).toThrow(
      "useHass must be used inside an <ArcusProvider>.",
    );
  });
});

describe("ArcusCard action bridge", () => {
  test("delegates to the latest hass and keeps one stable bridge", async () => {
    const hass = makeHass();
    const callService = vi.spyOn(hass, "callService");
    const card = new ArcusCard();
    card.setConfig(makeConfig());
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    const actions = card.actions;
    actions.callService("light", "toggle", {}, { entity_id: "light.stue" });

    expect(callService).toHaveBeenCalledWith(
      "light",
      "toggle",
      {},
      { entity_id: "light.stue" },
    );

    // A newer hass object must be picked up by the same, already-created
    // bridge instead of the closure keeping the first instance.
    const nextHass = makeHass();
    const nextCallService = vi.spyOn(nextHass, "callService");
    card.hass = nextHass;

    expect(card.actions).toBe(actions);
    actions.callService("switch", "turn_on", {}, { entity_id: "switch.test" });

    expect(nextCallService).toHaveBeenCalledWith(
      "switch",
      "turn_on",
      {},
      { entity_id: "switch.test" },
    );
    expect(callService).toHaveBeenCalledTimes(1);
  });
});
