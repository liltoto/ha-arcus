import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { buildModel } from "../../src/model/build";
import { icon } from "../../src/render/icons";
import type { AlertModel } from "../../src/types";
import { Footer } from "../../src/ui/organisms/Footer";
import { TopBar } from "../../src/ui/organisms/TopBar";
import { makeConfig, makeHass } from "../fixtures/home";
import { renderWithArcus, type ArcusRenderOptions } from "./home-test-utils";

const NOW = new Date("2026-11-13T01:19:00+01:00");
const now = () => NOW;

/** Card-only bindings that `buildBindings` cannot derive without `hass`. */
const BINDINGS = {
  date: "13. november 2026",
  person: "hjemme",
  clock: "01:19",
  version: "0.2.0",
};

const baseModel = buildModel(makeHass(), makeConfig(), NOW);

/** Compare icon bodies after happy-dom serializes both sides the same way. */
function iconBody(name: string): string {
  const host = document.createElement("div");
  host.innerHTML = icon(name);
  return host.querySelector("svg")?.innerHTML ?? "";
}

function renderedIcon(button: HTMLElement): string {
  return button.querySelector("svg")?.innerHTML ?? "";
}

function renderTopBar(options: ArcusRenderOptions = {}) {
  return renderWithArcus(<TopBar />, {
    now,
    bindings: BINDINGS,
    ...options,
  });
}

describe("TopBar", () => {
  it("renders the brand from the config with HJEM and ARCUS fallbacks", () => {
    const custom = renderTopBar({
      config: makeConfig({ title: "Villa", subtitle: "Nord" }),
    });
    expect(custom.container.querySelector(".brand-word")).toHaveTextContent(
      "VILLA",
    );
    expect(custom.container.querySelector(".brand-sub")).toHaveTextContent(
      "NORD",
    );
    custom.unmount();

    const fallback = renderTopBar({
      config: makeConfig({ title: "", subtitle: "" }),
    });
    expect(fallback.container.querySelector(".brand-word")).toHaveTextContent(
      "HJEM",
    );
    expect(fallback.container.querySelector(".brand-sub")).toHaveTextContent(
      "ARCUS",
    );
  });

  it("renders the date and presence bindings", () => {
    const { container } = renderTopBar();

    expect(container.querySelector(".topbar-date")).toHaveTextContent(
      "13. november 2026",
    );
    expect(container.querySelector(".pill.name")).toHaveTextContent("hjemme");
    expect(
      container.querySelector<HTMLElement>(".pill.name .dot")?.style.background,
    ).toBe("var(--sage)");
  });

  it("mutes the presence dot when nobody is home", () => {
    const hass = makeHass();
    hass.states["person.liltoto"] = {
      ...hass.states["person.liltoto"],
      state: "not_home",
    };

    const { container } = renderTopBar({ hass });

    expect(
      container.querySelector<HTMLElement>(".pill.name .dot")?.style.background,
    ).toBe("var(--muted)");
  });

  it("hides the alert pill when the model has no alerts", () => {
    const { container } = renderTopBar({
      model: { ...baseModel, alerts: [] },
    });

    expect(container.querySelector('[data-nav="alarmer"]')).toHaveAttribute(
      "hidden",
    );
  });

  it("shows the alert count when the model has alerts", () => {
    const alert: AlertModel = {
      sev: 2,
      key: "filter",
      title: "Filter",
      text: "Skift filter",
      route: "ventilation",
    };

    const { container } = renderTopBar({
      model: { ...baseModel, alerts: [alert] },
    });
    const pill = container.querySelector('[data-nav="alarmer"]');

    expect(pill).not.toHaveAttribute("hidden");
    expect(pill).toHaveTextContent("1");
  });

  it("cycles the atmosphere icon and reports each mode", async () => {
    const user = userEvent.setup();
    const { props } = renderTopBar();
    const button = screen.getByRole("button", { name: "Atmosfære" });

    expect(button).toHaveAttribute("data-act", "atmo");
    expect(button).not.toHaveAttribute("data-atmo-btn");
    expect(renderedIcon(button)).toBe(iconBody("spark"));

    await user.click(button);
    expect(props.actions.setAtmo).toHaveBeenNthCalledWith(1, "night");
    expect(renderedIcon(button)).toBe(iconBody("moon"));

    await user.click(button);
    expect(props.actions.setAtmo).toHaveBeenNthCalledWith(2, "day");
    expect(renderedIcon(button)).toBe(iconBody("sun"));

    await user.click(button);
    expect(props.actions.setAtmo).toHaveBeenNthCalledWith(3, "auto");
    expect(renderedIcon(button)).toBe(iconBody("spark"));
  });

  it("navigates from the brand and menu buttons", async () => {
    const user = userEvent.setup();
    const { props } = renderTopBar();

    await user.click(screen.getByRole("button", { name: "Gå til hjem" }));
    expect(props.actions.navigate).toHaveBeenCalledWith("hjem");

    await user.click(screen.getByRole("button", { name: "Alle lag" }));
    expect(props.actions.navigate).toHaveBeenCalledWith("alle");
    expect(props.actions.navigate).toHaveBeenCalledTimes(2);
  });
});

describe("Footer", () => {
  it("renders the mark, clock, and version", () => {
    const { container } = renderWithArcus(<Footer />, {
      bindings: BINDINGS,
    });
    const mark = container.querySelector(".mark");

    expect(mark).toHaveTextContent("Arcus · 01:19");
    expect(mark?.querySelector("svg.ico")).not.toBeNull();
    expect(container).toHaveTextContent("Home Assistant · 0.2.0");
  });
});
