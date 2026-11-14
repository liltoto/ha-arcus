import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ArcusCard } from "../../src/card";
import type { HistoryCache } from "../../src/data/history";
import { createTranslator } from "../../src/localize";
import { buildBindings } from "../../src/model/bindings";
import { buildModel } from "../../src/model/build";
import type { ArcusActions } from "../../src/ui/types";
import { ArcusApp } from "../../src/ui/ArcusApp";
import { makeConfig, makeHass } from "../fixtures/home";

const FIXED_NOW = new Date("2026-11-13T01:19:00+01:00");

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
    toast: vi.fn(),
    setAtmo: vi.fn(),
  };
}

/** Props matching the card bridge, so a render here proves the shell alone. */
function bridgeProps() {
  const hass = makeHass();
  const config = makeConfig();

  const model = buildModel(hass, config, FIXED_NOW);
  const t = createTranslator("da");

  return {
    hass,
    model,
    config,
    t,
    bindings: {
      ...buildBindings(model, config, t),
      date: "13. november 2026",
      clock: "01:19",
      heroDate: "Fredag · kl. 01:19",
      eyebrow: "NÆSTE BØN · Fajr 05:12",
      greet: "Godnat, <em>Test</em>",
      person: "hjemme",
      weatherTemp: "7°",
      weatherSub: "Let skyet",
      weatherStrip: "",
      version: "0.2.0",
      roomsMeta: "<b>7 rum</b> · 0 åbne · 0 lys tændt",
    },
    route: { base: "hjem", sub: null } as const,
    actions: actionsStub(),
    history: historyStub(),
    now: () => FIXED_NOW,
    atmo: "night" as const,
    dark: true,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("ArcusApp home shell", () => {
  test("renders the card shell and the real home organisms", () => {
    const { container } = render(<ArcusApp {...bridgeProps()} />);

    const app = container.querySelector<HTMLElement>(".app");
    expect(app).not.toBeNull();
    expect(app).toHaveAttribute("data-atmo", "night");
    expect(app).toHaveAttribute("data-density", "comfortable");
    expect(app?.classList.contains("light")).toBe(false);

    expect(app?.querySelector(".sky")).not.toBeNull();
    expect(app?.querySelector(".stars")).not.toBeNull();
    expect(app?.querySelector(".scroll")).not.toBeNull();
    expect(app?.querySelector(".wrap")).not.toBeNull();
    expect(app?.querySelector(".scrim")).not.toBeNull();
    expect(app?.querySelector(".footer")).not.toBeNull();

    expect(app?.querySelector("[data-scrim]")).not.toBeNull();
    expect(app?.querySelector("[data-toast]")).not.toBeNull();
    expect(app?.querySelector("[data-graph-tip]")).not.toBeNull();
    expect(app?.querySelector("[data-graph-cursor]")).not.toBeNull();

    const sheet = screen.getByRole("dialog", { name: "Detaljer" });
    expect(sheet).toHaveAttribute("data-sheet");
    expect(sheet).toHaveClass("sheet");
    expect(sheet.querySelector("[data-sheet-grab]")).not.toBeNull();
    expect(sheet.querySelector("arcus-sheets")).toBeNull();

    expect(app?.querySelector(".topbar-inner")).not.toBeNull();
    expect(app?.querySelector(".hero-top")).not.toBeNull();
    expect(app?.querySelector(".arc-wrap[data-arc]")).not.toBeNull();
    expect(app?.querySelector(".vitals")).not.toBeNull();
    expect(app?.querySelector(".room-grid")).not.toBeNull();
    expect(app?.querySelector(".chapter-grid")).not.toBeNull();
    expect(app?.querySelector(".quick-row")).not.toBeNull();
    expect(app?.querySelector(".footer .mark")).not.toBeNull();

    expect(app?.querySelector(".quick-row")).not.toBeNull();
    expect(app?.querySelectorAll(".quick-row .quick")).toHaveLength(5);
  });

  test("honours the light theme and an open sheet", () => {
    const { container } = render(
      <ArcusApp
        {...bridgeProps()}
        route={{ base: "energi", sub: null }}
        dark={false}
        atmo="dusk"
        config={makeConfig({ density: "compact" })}
      />,
    );

    const app = container.querySelector<HTMLElement>(".app");
    expect(app).toHaveClass("light");
    expect(app).toHaveAttribute("data-atmo", "dusk");
    expect(app).toHaveAttribute("data-density", "compact");
    expect(screen.getByRole("dialog")).toHaveClass("open");
  });
});

describe("ArcusCard React bridge", () => {
  test("mounts the React home inside the shadow root and unmounts cleanly", async () => {
    const card = new ArcusCard();
    card.setConfig(makeConfig());
    card.hass = makeHass();

    await act(async () => {
      document.body.appendChild(card);
      await card.updateComplete;
    });

    const shadow = card.shadowRoot!;
    expect(shadow.querySelector(".arcus-react > .app")).not.toBeNull();
    expect(shadow.querySelector("[data-sheet]")).not.toBeNull();
    expect(shadow.querySelector("[data-toast]")).not.toBeNull();
    expect(shadow.querySelector(".room-grid [data-room]")).not.toBeNull();

    expect(() => card.remove()).not.toThrow();
    expect(
      card.shadowRoot!.querySelector(".arcus-react")?.childElementCount ?? 0,
    ).toBe(0);

    // Re-mounting must create exactly one fresh root, not reuse the old one.
    await act(async () => {
      document.body.appendChild(card);
    });
    expect(shadow.querySelectorAll(".arcus-react > .app")).toHaveLength(1);
    expect(() => card.remove()).not.toThrow();
  });
});
