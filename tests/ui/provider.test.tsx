import { fireEvent, render, screen } from "@testing-library/react";
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
  useConfig,
  useHass,
} from "../../src/ui/providers/ArcusProvider";
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
  ArcusProviderProps,
  ArcusRoute,
} from "../../src/ui/types";
import { makeConfig, makeHass } from "../fixtures/home";

/** The sheet tests use the same minimal cache; the provider only forwards it. */
function historyStub(): HistoryCache {
  return {
    ensure: async () => undefined,
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
}

function actionsStub(): ArcusActions {
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

function providerProps(
  overrides: Partial<ArcusProviderProps> = {},
): ArcusProviderProps {
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
    children: null,
    ...overrides,
  };
}

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

function Probe({ label, onRender }: ProbeProps) {
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
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("ArcusProvider", () => {
  test("two providers keep their own config, state and actions", () => {
    const actionsA = actionsStub();
    const actionsB = actionsStub();
    const propsA = providerProps({
      config: makeConfig({ title: "Hjem A" }),
      actions: actionsA,
    });
    const propsB = providerProps({
      config: makeConfig({ title: "Hjem B" }),
      actions: actionsB,
    });

    render(
      <>
        <ArcusProvider {...propsA}>
          <Probe label="a" />
        </ArcusProvider>
        <ArcusProvider {...propsB}>
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
    const props = providerProps();
    const seen: Snapshot[] = [];
    const onRender = (snapshot: Snapshot) => seen.push(snapshot);

    const { rerender } = render(
      <ArcusProvider {...props}>
        <Probe label="one" onRender={onRender} />
      </ArcusProvider>,
    );

    const first = seen.at(-1)!;
    const nextHass: ArcusHass = {
      ...props.hass,
      states: {
        ...props.hass.states,
        "climate.wavin_stue": {
          ...props.hass.states["climate.wavin_stue"],
          state: "off",
        },
      },
    };

    rerender(
      <ArcusProvider {...props} hass={nextHass}>
        <Probe label="one" onRender={onRender} />
      </ArcusProvider>,
    );

    const latest = seen.at(-1)!;
    expect(latest.hass).toBe(nextHass);
    expect(latest.hass).not.toBe(first.hass);
    expect(latest.hass.states["climate.wavin_stue"].state).toBe("off");
    expect(screen.getByTestId("one-state")).toHaveTextContent("off");

    // Every other value was passed by reference and must not be recreated.
    expect(latest.model).toBe(first.model);
    expect(latest.config).toBe(first.config);
    expect(latest.t).toBe(first.t);
    expect(latest.bindings).toBe(first.bindings);
    expect(latest.route).toBe(first.route);
    expect(latest.actions).toBe(first.actions);
    expect(latest.history).toBe(first.history);
    expect(latest.now).toBe(first.now);
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
