import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Vitals } from "../../src/ui/organisms/Vitals";
import { renderWithArcus } from "./home-test-utils";

const WEATHER_STRIP =
  '<span class="wday"><span class="wname">I dag</span><span class="wico"></span><span class="wtemps"><b>4°</b>1°</span></span>';

function vitalFor(label: string): HTMLElement {
  const button = screen.getByText(label).closest("button");
  if (!button) throw new Error(`Missing vital button for ${label}`);
  return button;
}

describe("Vitals", () => {
  it("renders the four statistics from the bindings", () => {
    const { container, props } = renderWithArcus(<Vitals />);

    const indoor = vitalFor("Inde");
    expect(within(indoor).getByText(props.bindings.indoor)).toBeInTheDocument();
    expect(within(indoor).getByText("°C")).toBeInTheDocument();
    expect(
      within(indoor).getByText(props.bindings.indoorSub),
    ).toBeInTheDocument();

    const price = vitalFor("Elpris nu");
    expect(within(price).getByText(props.bindings.price)).toBeInTheDocument();
    expect(within(price).getByText("kr")).toBeInTheDocument();
    expect(
      within(price).getByText(props.bindings.priceSub),
    ).toBeInTheDocument();

    const battery = vitalFor("Batteri");
    expect(
      within(battery).getByText(props.bindings.battery),
    ).toBeInTheDocument();
    expect(within(battery).getByText("%")).toBeInTheDocument();
    expect(
      within(battery).getByText(props.bindings.batterySub),
    ).toBeInTheDocument();

    const solar = vitalFor("Sol lige nu");
    expect(
      within(solar).getByText(props.bindings.solarNow),
    ).toBeInTheDocument();
    expect(within(solar).getByText("W")).toBeInTheDocument();
    expect(
      within(solar).getByText(props.bindings.solarSub),
    ).toBeInTheDocument();

    expect(container.querySelectorAll(".vital-spark")).toHaveLength(3);
    expect(
      container.querySelector("svg.vital-spark[data-graph]"),
    ).not.toBeNull();
    expect(container.querySelector("[data-spark]")).toBeNull();

    const soc = props.model.solar?.batterySoc ?? 0;
    const ring = container.querySelector("[data-battery-ring]");
    expect(ring).not.toBeNull();
    expect(ring).toHaveAttribute(
      "stroke-dashoffset",
      String(100.5 - (soc / 100) * 100.5),
    );
    expect(ring).toHaveAttribute(
      "stroke",
      soc < 20 ? "var(--coral)" : soc > 80 ? "var(--sage)" : "var(--brass)",
    );

    const strip = container.querySelector(".weather-strip");
    expect(strip).not.toBeNull();
    expect(strip?.innerHTML).toBe("");
    expect(container.querySelector("[data-alert-slot]")).not.toBeNull();
  });

  it("renders the weather strip markup supplied by the card binding", () => {
    const result = renderWithArcus(<Vitals />);

    // `buildBindings` does not know about the async forecast; the card adds
    // `weatherStrip` in `_binds()`. Mirror that here and re-render.
    result.props.bindings.weatherStrip = WEATHER_STRIP;
    result.rerender(<Vitals />);

    const strip = result.container.querySelector(".weather-strip");
    expect(strip).not.toBeNull();
    expect(strip?.innerHTML).toContain('class="wday"');
    expect(screen.getByText("I dag")).toBeInTheDocument();
    expect(strip?.textContent).toContain("4°");
  });

  it("navigates to the first room, energy, and solar from the vitals", async () => {
    const user = userEvent.setup();
    const { props } = renderWithArcus(<Vitals />);

    await user.click(vitalFor("Inde"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(1, "rum/stue");

    await user.click(vitalFor("Elpris nu"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(2, "energi");

    await user.click(vitalFor("Batteri"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(3, "sol");

    await user.click(vitalFor("Sol lige nu"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(4, "sol");
  });
});
