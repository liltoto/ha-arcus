import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { parseGraph } from "../../../src/render/graph";
import { EnergyBody } from "../../../src/ui/organisms/layers/EnergyBody";
import { renderLayer } from "../layer-test-utils";
import { makeArcusProps } from "../home-test-utils";

// The fixture price curve is in Europe/Copenhagen. Pin the zone so the "now"
// bar and the cheapest window are deterministic on CI, which usually runs UTC.
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

describe("EnergyBody", () => {
  test("renders the energy header and summary", () => {
    const { container } = renderLayer(EnergyBody);

    expect(container.querySelector(".sheet-kicker")).toHaveTextContent(
      "ENERGI",
    );
    expect(container.querySelector(".sheet-title")).toHaveTextContent("Energi");
    const summary = container.querySelector(".sheet-sum");
    expect(summary).toHaveTextContent("1,75 kr/kWh");
    expect(summary).toHaveTextContent("billigst 11–14");
  });

  test("renders the current price and the 24 price bars", () => {
    const { container } = renderLayer(EnergyBody);

    const big = container.querySelector(".big-read");
    expect(big).toHaveTextContent("1,75");
    expect(big?.querySelector("small")).toHaveTextContent("kr/kWh");

    const bars = container.querySelectorAll(".bar-chart i");
    expect(bars).toHaveLength(24);
    // 01:19 fixture time: the second bar is the current hour.
    expect(bars[1]).toHaveClass("now");
    expect(bars[0]).not.toHaveClass("now");

    const readings = container.querySelectorAll(".readings .reading");
    expect(readings).toHaveLength(4);
    expect(readings[0]).toHaveTextContent("Køb");
    expect(readings[0]).toHaveTextContent("1,75");
    expect(readings[1]).toHaveTextContent("Salg");
    expect(readings[1]).toHaveTextContent("1,10");
    expect(readings[2]).toHaveTextContent("Spot");
    expect(readings[2]).toHaveTextContent("1,11");
    expect(readings[3]).toHaveTextContent("Næste time");
    expect(readings[3]).toHaveTextContent("1,62");
  });

  test("renders the day price list and the chart hover hook", () => {
    const { container } = renderLayer(EnergyBody);

    const chart = container.querySelector<HTMLElement>(".bar-chart");
    expect(chart).not.toBeNull();
    expect(chart).toHaveAttribute("data-graph", "bars");
    expect(chart).toHaveAttribute("data-gu", "kr");
    expect(chart).toHaveAttribute("data-gd", "2");

    const graph = parseGraph(chart!);
    expect(graph?.mode).toBe("bars");
    expect(graph?.series[0]?.values).toHaveLength(24);
    expect(graph?.series[0]?.values[0]).toBeCloseTo(1.815, 3);

    expect(container.querySelectorAll(".chart-cap span")).toHaveLength(5);

    const rows = container.querySelectorAll(".list .row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Laveste");
    expect(rows[0]).toHaveTextContent("0,62");
    expect(rows[1]).toHaveTextContent("Højeste");
    expect(rows[1]).toHaveTextContent("3,33");
    expect(rows[2]).toHaveTextContent("Forrige time");
    expect(rows[2]).toHaveTextContent("1,64");
    expect(container.querySelectorAll(".list .row svg.ico")).toHaveLength(3);
  });

  test("navigates to the related sheets and closes through the actions bridge", () => {
    const { props } = renderLayer(EnergyBody);

    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(props.actions.closeSheet).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Solceller" }));
    expect(props.actions.openSheet).toHaveBeenCalledWith("sol");

    fireEvent.click(screen.getByRole("button", { name: "Vand" }));
    expect(props.actions.openSheet).toHaveBeenCalledWith("vand");

    fireEvent.click(screen.getByRole("button", { name: "Teknik" }));
    expect(props.actions.openSheet).toHaveBeenCalledWith("teknik");
  });

  test("renders the calm empty state when the price model is missing", () => {
    const base = makeArcusProps();
    const model = { ...base.model, price: undefined, energy: undefined };
    const { container } = renderLayer(EnergyBody, { model });

    expect(container.querySelector(".sheet-title")).toHaveTextContent("Energi");
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "Ingen data",
    );
    expect(container.querySelector(".empty")).toHaveTextContent("Ingen data");
    expect(container.querySelector(".bar-chart")).toBeNull();
  });
});
