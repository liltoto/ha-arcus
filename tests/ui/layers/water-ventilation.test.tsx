import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { HistoryCache } from "../../../src/data/history";
import { buildModel } from "../../../src/model/build";
import { parseGraph } from "../../../src/render/graph";
import { WaterBody } from "../../../src/ui/organisms/layers/WaterBody";
import { VentilationBody } from "../../../src/ui/organisms/layers/VentilationBody";
import { ArcusProvider } from "../../../src/ui/providers/ArcusProvider";
import type { ArcusRoute } from "../../../src/ui/types";
import { makeConfig, makeHass } from "../../fixtures/home";
import { makeArcusProps } from "../home-test-utils";
import { renderLayer } from "../layer-test-utils";

const WATER_ROUTE: ArcusRoute = { base: "vand", sub: null };
const VENT_ROUTE: ArcusRoute = { base: "ventilation", sub: null };
const LEAK_ID = "binary_sensor.klippbok_water_leak_sensor_water_leak";

function readout(container: HTMLElement, label: string) {
  const cell = [...container.querySelectorAll<HTMLElement>(".reading")].find(
    (reading) => reading.querySelector(".l")?.textContent === label,
  );
  return {
    value: cell?.querySelector(".v span")?.textContent ?? null,
    unit: cell?.querySelector(".v small")?.textContent ?? null,
  };
}

function block(container: HTMLElement, label: string): HTMLElement {
  return [...container.querySelectorAll<HTMLElement>(".block")].find(
    (entry) => entry.querySelector(".block-label")?.textContent === label,
  )!;
}

describe("WaterBody", () => {
  test("renders the header, consumption and BWT readings", () => {
    const { container } = renderLayer(WaterBody, { route: WATER_ROUTE });

    expect(container.querySelector(".sheet-kicker")).toHaveTextContent("VAND");
    expect(container.querySelector(".sheet-title")).toHaveTextContent("Vand");
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "12,2 L i dag · BWT OK · salt 41 %",
    );
    expect(container.querySelector(".big-read")).toHaveTextContent("12,2");
    expect(container.querySelector(".big-read")).toHaveTextContent("L i dag");
    expect(container.querySelector(".block-note")).toHaveTextContent(
      "2.963 L denne måned og 57,0 m³ i alt",
    );

    expect(readout(container, "Denne måned")).toEqual({
      value: "2.963",
      unit: "L",
    });
    expect(readout(container, "I alt")).toEqual({ value: "57,0", unit: "m³" });
    expect(readout(container, "Udgift")).toEqual({
      value: "4.010",
      unit: "kr",
    });
    expect(readout(container, "Flow nu")).toEqual({
      value: "0,00",
      unit: "m³/h",
    });

    expect(readout(container, "Salt")).toEqual({ value: "41", unit: "%" });
    expect(readout(container, "Rækker til")).toEqual({
      value: "35",
      unit: "dage",
    });
    expect(readout(container, "Kapacitet")).toEqual({ value: "67", unit: "L" });
    expect(readout(container, "Flow")).toEqual({
      value: "0,00",
      unit: "m³/h",
    });

    const chart = container.querySelector(".chart-box");
    expect(chart).toHaveClass("no-data");
    expect(chart?.querySelector(".chart-empty")).toHaveTextContent(
      "Ingen data",
    );
    expect(chart?.querySelector("svg")).not.toHaveAttribute("data-graph");
  });

  test("shows the dry leak sensors and the leak battery", () => {
    const { container, props } = renderLayer(WaterBody, {
      route: WATER_ROUTE,
    });

    expect(props.model.security?.leak).toBe(false);
    const leakBlock = block(container, "Vandlækage");
    expect(leakBlock.querySelector(".block-head b")).toHaveTextContent(
      "alt tørt",
    );
    expect(screen.getAllByText("Ingen vand")).toHaveLength(2);
    expect(screen.getAllByText("KLIPPBOK køkken")).toHaveLength(2);
    expect(leakBlock.querySelector(".row-val")).toHaveTextContent("88");
    expect(leakBlock.querySelector(".row-val small")).toHaveTextContent("%");
    expect(leakBlock.querySelectorAll(".status-line .dot.warn")).toHaveLength(
      0,
    );
    expect(leakBlock.querySelectorAll(".row")).toHaveLength(3);
  });

  test("turns a wet sensor into an alarm", () => {
    const hass = makeHass();
    hass.states[LEAK_ID] = { ...hass.states[LEAK_ID], state: "on" };
    const { container, props } = renderLayer(WaterBody, {
      route: WATER_ROUTE,
      hass,
    });

    expect(props.model.security?.leak).toBe(true);
    expect(screen.getByText("Vand registreret")).toBeInTheDocument();
    expect(
      block(container, "Vandlækage").querySelector(".block-head b"),
    ).toHaveTextContent("ALARM");
    expect(container.querySelector(".status-line .dot.warn")).not.toBeNull();
  });

  test("the holiday toggle calls input_boolean.toggle and close closes", () => {
    const { props } = renderLayer(WaterBody, { route: WATER_ROUTE });
    const toggle = screen.getByRole("button", { name: "Ferietilstand" });

    expect(toggle).toHaveAttribute("data-act", "toggle-bool");
    expect(toggle).not.toHaveClass("on");
    fireEvent.click(toggle);

    expect(props.actions.callService).toHaveBeenCalledWith(
      "input_boolean",
      "toggle",
      {},
      { entity_id: "input_boolean.bwt_holiday_mode" },
    );

    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(props.actions.closeSheet).toHaveBeenCalledTimes(1);
  });

  test("binds the 24-hour flow history to the chart", () => {
    const props = makeArcusProps({ route: WATER_ROUTE });
    const values = [0, 0.42, 0.18, 0.31];
    const history = {
      ensure: async () => undefined,
      series: (entityId: string) =>
        entityId === props.config.water?.flow ? values : [],
      window: () => [],
      raw: () => [],
    } as unknown as HistoryCache;

    const { container } = render(
      <ArcusProvider {...props} history={history}>
        <WaterBody route={WATER_ROUTE} />
      </ArcusProvider>,
    );

    const chart = container.querySelector(".chart-box")!;
    expect(chart).not.toHaveClass("no-data");
    const svg = chart.querySelector("svg")!;
    expect(svg).toHaveAttribute("data-graph", "line");
    const graph = parseGraph(svg);
    expect(graph?.series[0].values).toEqual(values);
    expect(graph?.series[0].unit).toBe("L/min");
    expect(svg.querySelector('path[fill="none"]')?.getAttribute("d")).not.toBe(
      "",
    );
  });

  test("falls back to an empty state without water data", () => {
    const base = buildModel(makeHass(), makeConfig());
    const model = { ...base, water: undefined };
    const { container } = renderLayer(WaterBody, {
      route: WATER_ROUTE,
      model,
    });

    expect(container.querySelector(".sheet-title")).toHaveTextContent("Vand");
    expect(container.querySelector(".empty")).toHaveTextContent("Ingen data");
    expect(container.querySelector(".readings")).toBeNull();
  });
});

describe("VentilationBody", () => {
  test("renders the header, Nilan readings, filter and system state", () => {
    const { container } = renderLayer(VentilationBody, {
      route: VENT_ROUTE,
    });

    expect(container.querySelector(".sheet-kicker")).toHaveTextContent(
      "SYSTEM",
    );
    expect(container.querySelector(".sheet-title")).toHaveTextContent(
      "Ventilation",
    );
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "23,2° · trin 2 · Skift filter",
    );

    expect(readout(container, "Rumtemperatur")).toEqual({
      value: "23,2",
      unit: "°C",
    });
    expect(readout(container, "Luftfugtighed")).toEqual({
      value: "38",
      unit: "%",
    });
    expect(readout(container, "Blæsertrin")).toEqual({
      value: "2",
      unit: "/ 4",
    });
    expect(readout(container, "Effektivitet")).toEqual({
      value: "98",
      unit: "%",
    });

    const filter = block(container, "Filter");
    expect(filter.querySelector(".block-head b")).toHaveTextContent(
      "Skift filter",
    );
    expect(filter.querySelector(".status-line")).toHaveTextContent(
      "Skift filter",
    );
    expect(filter.querySelector(".status-line .dot")).toHaveClass("warn");
    expect(readout(filter, "Dage siden skift").value).toBe("0");
    expect(readout(filter, "Dage til næste").value).toBe("0");
    expect(readout(filter, "Indtagshastighed")).toEqual({
      value: "26",
      unit: "%",
    });
    expect(readout(filter, "Afkastshastighed")).toEqual({
      value: "38",
      unit: "%",
    });

    const reset = screen.getByRole("button", { name: "Nulstil alarm" });
    expect(reset).toHaveAttribute("data-act", "press-button");
    expect(reset).toHaveAttribute("data-entity", "button.nilan602_reset_alarm");
    expect(screen.getByText("VPL 10 uden køl")).toBeInTheDocument();
    expect(screen.getByText("2.1.35")).toBeInTheDocument();
    expect(screen.getAllByText("Auto").length).toBeGreaterThan(0);
  });

  test("draws the five-node airflow", () => {
    const { container } = renderLayer(VentilationBody, {
      route: VENT_ROUTE,
    });
    const svg = container.querySelector(".air-flow svg")!;

    expect(svg).not.toBeNull();
    expect(
      [...svg.querySelectorAll(".flow-label")].map(
        (label) => label.textContent,
      ),
    ).toEqual(["UDE", "IND", "RUM", "AFKAST", "UD", "NILAN · LUFTVEJ"]);
    expect(
      [...svg.querySelectorAll(".flow-val")].map((value) => value.textContent),
    ).toEqual(["4,5°", "22,8°", "23,2°", "23,2°", "10,8°"]);
    expect(svg.querySelectorAll("circle")).toHaveLength(5);
    expect(svg.querySelectorAll("path[marker-end]")).toHaveLength(4);
  });

  test("fan, mode and setpoint controls call the climate services", () => {
    const { container, props } = renderLayer(VentilationBody, {
      route: VENT_ROUTE,
    });
    const climateId = "climate.nilan602_nilan";

    expect(
      container.querySelector('[data-act="fan"][data-mode="2"]'),
    ).toHaveClass("active");
    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-act="fan"][data-mode="3"]',
      )!,
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "climate",
      "set_fan_mode",
      { fan_mode: "3" },
      { entity_id: climateId },
    );

    expect(
      container.querySelector('[data-act="hvac"][data-mode="heat_cool"]'),
    ).toHaveClass("active");
    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-act="hvac"][data-mode="cool"]',
      )!,
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "climate",
      "set_hvac_mode",
      { hvac_mode: "cool" },
      { entity_id: climateId },
    );

    expect(
      container.querySelector(
        `[data-act="temp-step"][data-entity="${climateId}"]`,
      ),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Increase Setpunkt" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "climate",
      "set_temperature",
      { temperature: 24 },
      { entity_id: climateId },
    );
  });

  test("the filter reset and user function call their services", () => {
    const { container, props } = renderLayer(VentilationBody, {
      route: VENT_ROUTE,
    });

    fireEvent.click(screen.getByRole("button", { name: "Nulstil alarm" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "button",
      "press",
      {},
      { entity_id: "button.nilan602_reset_alarm" },
    );

    const select = container.querySelector<HTMLSelectElement>(
      '[data-select-entity="select.nilan602_set_user_function"]',
    )!;
    expect(select.value).toBe("None");
    fireEvent.change(select, { target: { value: "Extend" } });
    expect(props.actions.callService).toHaveBeenCalledWith(
      "select",
      "select_option",
      { option: "Extend" },
      { entity_id: "select.nilan602_set_user_function" },
    );
  });

  test("falls back to an empty state without ventilation data", () => {
    const base = buildModel(makeHass(), makeConfig());
    const model = { ...base, ventilation: undefined };
    const { container } = renderLayer(VentilationBody, {
      route: VENT_ROUTE,
      model,
    });

    expect(container.querySelector(".sheet-title")).toHaveTextContent(
      "Ventilation",
    );
    expect(container.querySelector(".empty")).toHaveTextContent(
      "Ingen data endnu",
    );
    expect(container.querySelector(".readings")).toBeNull();
  });
});
