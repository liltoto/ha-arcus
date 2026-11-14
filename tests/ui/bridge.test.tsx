import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ArcusCard } from "../../src/card";
import type { HistoryCache } from "../../src/data/history";
import { createTranslator } from "../../src/localize";
import { buildModel } from "../../src/model/build";
import type { ArcusActions } from "../../src/ui/types";
import { ArcusApp } from "../../src/ui/ArcusApp";
import type { SheetApp } from "../../src/views/layers/types";
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
    confirm: vi.fn(),
    toast: vi.fn(),
    setAtmo: vi.fn(),
  };
}

function appStub(): SheetApp {
  return {
    _call: vi.fn(),
    _closeRoute: vi.fn(),
    _sheetHeader: vi.fn(() => ""),
    _sheetTabs: vi.fn(() => ""),
    _confirm: null,
    _refreshConfirm: vi.fn(),
  } as unknown as SheetApp;
}

/** Props matching the card bridge, so a render here proves the shell alone. */
function bridgeProps() {
  const hass = makeHass();
  const config = makeConfig();

  return {
    hass,
    model: buildModel(hass, config, FIXED_NOW),
    config,
    t: createTranslator("da"),
    bindings: {},
    route: { base: "energi", sub: null } as const,
    actions: actionsStub(),
    history: historyStub(),
    now: () => FIXED_NOW,
    app: appStub(),
    atmo: "night" as const,
    dark: true,
    sheetOpen: false,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("ArcusApp home shell", () => {
  test("renders the card shell slots and placeholder organisms", () => {
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
    expect(sheet.className).toBe("sheet");
    expect(sheet.childElementCount).toBe(0);

    for (const name of [
      "topbar",
      "hero",
      "vitals",
      "room-grid",
      "chapter-grid",
      "quick-actions",
      "footer",
    ]) {
      expect(
        app?.querySelector(`[data-placeholder="${name}"]`),
        name,
      ).not.toBeNull();
    }
  });

  test("honours the light theme and an open sheet", () => {
    const { container } = render(
      <ArcusApp
        {...bridgeProps()}
        dark={false}
        sheetOpen
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
    expect(
      shadow.querySelector('[data-placeholder="room-grid"]'),
    ).not.toBeNull();

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
