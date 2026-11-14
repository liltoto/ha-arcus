import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useMemo, useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ArcusCard } from "../../src/card";
import { buildModel } from "../../src/model/build";
import type { ArcusHass } from "../../src/types";
import type { ArcusActions, ArcusRoute } from "../../src/ui/types";
import { ArcusProvider } from "../../src/ui/providers/ArcusProvider";
import { SheetFrame } from "../../src/ui/pages/SheetFrame";
import { makeConfig, makeHass } from "../fixtures/home";
import {
  makeActions,
  makeArcusProps,
  renderWithArcus,
} from "./home-test-utils";



interface HarnessControls {
  closeSheet: () => void;
  changeRoute: (route: ArcusRoute) => void;
  bumpHass: () => void;
}

interface SheetHarnessProps {
  actions: ArcusActions;
  controls: HarnessControls;
  hass?: ArcusHass;
}

/** Route/state harness for interactions that need a live provider. */
function SheetHarness({
  actions,
  controls,
  hass: initialHass,
}: SheetHarnessProps) {
  const base = useMemo(
    () =>
      makeArcusProps({
        hass: initialHass,
        route: { base: "lys", sub: null },
      }),
    [initialHass],
  );
  const [route, setRoute] = useState<ArcusRoute>({
    base: "lys",
    sub: null,
  });
  const [hass, setHass] = useState<ArcusHass>(base.hass);
  const model = useMemo(
    () => buildModel(hass, base.config, base.now()),
    [hass, base.config, base.now],
  );
  const wiredActions = useMemo<ArcusActions>(
    () => ({
      ...actions,
      closeSheet: () => setRoute({ base: "hjem", sub: null }),
    }),
    [actions],
  );

  controls.closeSheet = () => setRoute({ base: "hjem", sub: null });
  controls.changeRoute = setRoute;
  controls.bumpHass = () => setHass(makeHass());

  return (
    <ArcusProvider
      {...base}
      hass={hass}
      model={model}
      route={route}
      actions={wiredActions}
    >
      <SheetFrame />
    </ArcusProvider>
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("SheetFrame", () => {
  test("renders the scrim, sheet header, and the react lights body", () => {
    const { container } = renderWithArcus(<SheetFrame />, {
      route: { base: "lys", sub: null },
    });

    const sheet = container.querySelector<HTMLElement>("[data-sheet]");
    expect(sheet).not.toBeNull();
    expect(sheet).toHaveClass("open");
    expect(container.querySelector("[data-scrim]")).toHaveClass("open");
    expect(screen.getByRole("dialog", { name: "Detaljer" })).toBe(sheet);

    expect(sheet?.querySelector(".sheet-head")).not.toBeNull();
    expect(sheet?.querySelector(".sheet-title")).toHaveTextContent("Lys");
    expect(sheet?.querySelector(".sheet-scroll")).not.toBeNull();
    expect(
      sheet?.querySelector(
        '[data-act="toggle-light"][data-entity="light.kokken"]',
      ),
    ).not.toBeNull();
    expect(sheet?.querySelector(".light-details")).not.toBeNull();
    expect(sheet?.querySelector("input.range")).not.toBeNull();
    expect(screen.getAllByText("Køkken").length).toBeGreaterThan(0);
  });

  test("escape and the scrim close the sheet, inside clicks do not", () => {
    const { container, props } = renderWithArcus(
      <SheetFrame />,
      { route: { base: "lys", sub: null } },
    );
    const closeSheet = props.actions.closeSheet;

    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeSheet).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector("[data-scrim]")!);
    expect(closeSheet).toHaveBeenCalledTimes(2);

    fireEvent.click(container.querySelector(".sheet-head")!);
    expect(closeSheet).toHaveBeenCalledTimes(2);
  });

  test("focus moves to close, tabs stay inside, and unmount restores focus", async () => {
    const opener = document.createElement("button");
    opener.textContent = "opener";
    document.body.appendChild(opener);
    opener.focus();

    const { container, unmount } = renderWithArcus(
      <SheetFrame />,
      { route: { base: "lys", sub: null } },
    );
    const sheet = container.querySelector<HTMLElement>("[data-sheet]")!;
    const close = screen.getByRole("button", { name: "Luk" });

    await waitFor(() => expect(document.activeElement).toBe(close));

    const focusable = [
      ...sheet.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.closest("details:not([open])"));
    const last = focusable[focusable.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  test("escape closes the open route and restores focus", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const actions = makeActions();
    const controls: HarnessControls = {
      closeSheet: () => undefined,
      changeRoute: () => undefined,
      bumpHass: () => undefined,
    };
    const { container } = render(
      <SheetHarness actions={actions} controls={controls} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Luk" })).toHaveFocus(),
    );

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(container.querySelector(".sheet")).not.toHaveClass("open"),
    );
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });

  test("a route change scrolls the body back to the top", () => {
    const actions = makeActions();
    const controls: HarnessControls = {
      closeSheet: () => undefined,
      changeRoute: () => undefined,
      bumpHass: () => undefined,
    };
    const { container } = render(
      <SheetHarness actions={actions} controls={controls} />,
    );
    const scroll = container.querySelector<HTMLElement>(".sheet-scroll")!;
    const scrollTo = vi.fn();
    (scroll as unknown as { scrollTo: () => void }).scrollTo = scrollTo;

    act(() => controls.changeRoute({ base: "lys", sub: "nyt" }));

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test("a hass update does not interrupt a focused brightness slider", () => {
    const actions = makeActions();
    const controls: HarnessControls = {
      closeSheet: () => undefined,
      changeRoute: () => undefined,
      bumpHass: () => undefined,
    };
    const { container } = render(
      <SheetHarness actions={actions} controls={controls} />,
    );
    const slider = container.querySelector<HTMLInputElement>(
      '[data-light-range="light.kokken"]',
    )!;

    slider.focus();
    fireEvent.input(slider, { target: { value: "42" } });
    expect(slider.value).toBe("42");

    act(() => controls.bumpHass());
    expect(slider.value).toBe("42");
    expect(actions.callService).toHaveBeenCalledWith(
      "light",
      "turn_on",
      { brightness_pct: 42 },
      { entity_id: "light.kokken" },
    );
  });

  test("a group toggle delegates to light.toggle", () => {
    const { container, props } = renderWithArcus(
      <SheetFrame />,
      { route: { base: "lys", sub: null } },
    );
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-act="toggle-light"][data-entity="light.kokken"]',
    )!;

    fireEvent.click(toggle);

    expect(props.actions.callService).toHaveBeenCalledWith(
      "light",
      "toggle",
      {},
      { entity_id: "light.kokken" },
    );
  });
});

describe("ArcusCard sheet routing", () => {
  test("renders lights and rooms in react", async () => {
    window.history.replaceState(null, "", "/#/lys");
    const initial = makeHass();
    const card = new ArcusCard();
    card.setConfig(makeConfig());
    card.hass = initial;

    await act(async () => {
      document.body.appendChild(card);
      await card.updateComplete;
    });

    const shadow = card.shadowRoot!;
    expect(shadow.querySelector(".sheet.open")).not.toBeNull();
    expect(shadow.querySelector(".sheet-title")).toHaveTextContent("Lys");
    expect(shadow.querySelector("arcus-sheets")).toBeNull();

    // A focused slider must survive a hass push that rebuilds the model.
    const slider = shadow.querySelector<HTMLInputElement>(
      '[data-light-range="light.kokken"]',
    )!;
    slider.focus();
    expect(shadow.activeElement).toBe(slider);
    fireEvent.input(slider, { target: { value: "37" } });
    expect(slider.value).toBe("37");

    const next = makeHass();
    next.areas = initial.areas;
    next.devices = initial.devices;
    next.entities = initial.entities;
    await act(async () => {
      card.hass = next;
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(slider.value).toBe("37");

    await act(async () => {
      window.location.hash = "#/rum/stue";
      window.dispatchEvent(new Event("hashchange"));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(shadow.querySelector(".sheet.open")).not.toBeNull();
    expect(shadow.querySelector("arcus-sheets")).toBeNull();
    expect(shadow.querySelector(".sheet-title")).toHaveTextContent("Stue");
    expect(shadow.querySelector(".sheet-scroll .readings")).not.toBeNull();

    await act(async () => {
      card._closeRoute();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(shadow.querySelector(".sheet")).not.toHaveClass("open");
    // The body stays mounted briefly so the CSS slide-out can finish.
    expect(shadow.querySelector(".sheet-scroll")).not.toBeNull();

    card.remove();
  });
});
