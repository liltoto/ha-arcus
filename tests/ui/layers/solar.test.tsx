import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { buildModel } from "../../../src/model/build";
import { SolarBody } from "../../../src/ui/organisms/layers/SolarBody";
import type { ArcusConfig } from "../../../src/types";
import { makeConfig, makeHass } from "../../fixtures/home";
import { renderLayer } from "../layer-test-utils";
import type { ArcusRenderOptions } from "../home-test-utils";

// The fixture forecast points and the mock home are in Europe/Copenhagen.
// Pin the zone so the local-day filters produce the same chart point counts
// on CI (which usually runs in UTC).
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T01:19:00+01:00");

function renderSolar(
  sub: string | null = null,
  options: ArcusRenderOptions = {},
) {
  return renderLayer(SolarBody, {
    ...options,
    route: { base: "sol", sub },
  });
}

function baseModel(config: ArcusConfig = makeConfig()) {
  return buildModel(makeHass(), config, NOW);
}

describe("SolarBody", () => {
  it("renders the overview header, readouts, tabs, and charts", async () => {
    const user = userEvent.setup();
    const { container, props } = renderSolar();

    expect(
      screen.getByRole("heading", { name: "Solceller" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".sheet-kicker")).toHaveTextContent("SOL");
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "27 % batteri",
    );
    const readings = container.querySelector(".readings") as HTMLElement;
    expect(within(readings).getByText("Batteri")).toBeInTheDocument();
    expect(readings).toHaveTextContent("15,3");
    expect(within(readings).getByText("Huset bruger")).toBeInTheDocument();
    expect(within(readings).getByText("Lige nu")).toBeInTheDocument();

    const tabs = container.querySelector(".sheet-tabs") as HTMLElement;
    expect(tabs).not.toBeNull();
    expect(within(tabs).getAllByRole("button")).toHaveLength(5);
    expect(tabs.querySelector(".tab.active")).toHaveAttribute(
      "data-tab",
      "overblik",
    );

    const chart = container.querySelector(
      '[data-chart="solar-24h"]',
    ) as HTMLElement;
    expect(chart).not.toBeNull();
    expect(chart).toHaveAttribute("data-graph", "line");
    expect(chart).toHaveAttribute("data-points", "96");
    expect(chart.querySelector("[data-chart-line]")).not.toBeNull();
    expect(chart.querySelector("[data-chart-area]")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Luk" }));
    expect(props.actions.closeSheet).toHaveBeenCalledTimes(1);

    // The old external Helios 3D shortcut is gone; the overview only exposes
    // the in-dashboard solar tabs.
    expect(container.querySelector('[data-act="helios"]')).toBeNull();
    await user.click(
      container.querySelector<HTMLElement>('[data-nav="sol/produktion"]')!,
    );
    expect(props.actions.navigate).toHaveBeenCalledWith("sol/produktion");
  });

  it("navigates to each tab route from the segmented strip", async () => {
    const user = userEvent.setup();
    const { container, props } = renderSolar();
    const tabs = within(container.querySelector(".sheet-tabs") as HTMLElement);

    const expected: Array<[string, string]> = [
      ["Produktion", "sol/produktion"],
      ["Batteri", "sol/batteri"],
      ["Prognose", "sol/prognose"],
      ["Afkast", "sol/afkast"],
      ["Overblik", "sol"],
    ];

    for (const [label, path] of expected) {
      await user.click(tabs.getByRole("button", { name: label }));
      expect(props.actions.navigate).toHaveBeenLastCalledWith(path);
    }
    expect(props.actions.navigate).toHaveBeenCalledTimes(expected.length);
  });

  it("renders the production forecast, strings, totals, and daily bars", () => {
    const { container } = renderSolar("produktion");

    expect(screen.getByText("Produktion mod prognose")).toBeInTheDocument();
    expect(screen.getByText("Strings")).toBeInTheDocument();
    expect(screen.getByText("Total produceret")).toBeInTheDocument();
    expect(container.querySelector(".tab.active")).toHaveAttribute(
      "data-tab",
      "produktion",
    );

    const chart = container.querySelector(
      '[data-chart="solar-production-forecast"]',
    ) as HTMLElement;
    expect(chart).not.toBeNull();
    expect(chart).toHaveAttribute("data-graph", "line");
    expect(
      chart.querySelector('[data-chart-line="solarForecast"]'),
    ).not.toBeNull();
    expect(
      chart.querySelector('[data-chart-area="solarForecast"]'),
    ).not.toBeNull();
    expect(chart.querySelector("[data-chart-line]")).not.toBeNull();
    expect(chart.getAttribute("data-gs")).toContain("Faktisk");
    const midnight = new Date("2026-11-13T00:00:00+01:00").getTime();
    expect(chart).toHaveAttribute("data-gt0", String(midnight));
    expect(chart).toHaveAttribute("data-gt1", String(midnight + 86_400_000));

    const bars = container.querySelector(
      '[data-bars="solarWeek"]',
    ) as HTMLElement;
    expect(bars).not.toBeNull();
    expect(bars.querySelector(".day-empty")).not.toBeNull();
  });

  it("renders the battery ring and the seven-day battery charts", () => {
    const { container } = renderSolar("batteri");

    const ring = container.querySelector("[data-battery-ring]") as HTMLElement;
    expect(ring).not.toBeNull();
    expect(ring.querySelector("svg")).not.toBeNull();
    expect(ring.querySelectorAll("circle")).toHaveLength(2);
    expect(ring.querySelector(".big-read")).toHaveTextContent("27");
    expect(container.querySelector(".tab.active")).toHaveAttribute(
      "data-tab",
      "batteri",
    );

    expect(screen.getByText("Ladning · 7 dage")).toBeInTheDocument();
    expect(screen.getByText("Lad / aflad · 7 dage")).toBeInTheDocument();
    expect(
      container.querySelector('[data-chart="solar-soc-7d"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-chart="solar-charge-7d"]'),
    ).not.toBeNull();
  });

  it("renders a missing battery as an em dash without crashing", () => {
    const base = baseModel();
    const solar = {
      ...base.solar!,
      batterySoc: null,
      batteryPower: null,
      batteryTemperature: null,
      batteryVoltage: null,
      batteryCurrent: null,
      batteryCharge: null,
      batteryDischarge: null,
      batteryMinSoc: null,
      batteryMaxSoc: null,
    };
    const { container } = renderSolar("batteri", {
      model: { ...base, solar },
    });

    expect(
      container.querySelector("[data-battery-ring] .big-read"),
    ).toHaveTextContent("–");
    expect(
      container.querySelector('[data-chart="solar-soc-7d"]'),
    ).not.toBeNull();
  });

  it("renders the forecast arc and the 48-hour forecast chart", () => {
    const { container } = renderSolar("prognose");

    expect(screen.getByText("Prognose · 48 timer")).toBeInTheDocument();
    expect(screen.getByText("Kommende dage")).toBeInTheDocument();

    const arc = container.querySelector("[data-solar-arc]") as HTMLElement;
    expect(arc).not.toBeNull();
    const arcChart = arc.querySelector(
      '[data-chart="solar-arc"]',
    ) as HTMLElement;
    expect(arcChart).toHaveAttribute("data-graph", "timed");
    expect(arcChart).toHaveAttribute("data-points", "96");

    const chart = container.querySelector(
      '[data-chart="solar-48h"]',
    ) as HTMLElement;
    expect(chart).not.toBeNull();
    expect(chart).toHaveAttribute("data-graph", "line");
    expect(chart).toHaveAttribute("data-points", "192");
  });

  it("renders the payback economics, dates, and savings charts", () => {
    const { container } = renderSolar("afkast");

    expect(
      screen.getByText("Hvornår er det tilbagebetalt?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tilbage")).toBeInTheDocument();
    expect(screen.getByText("Installeret")).toBeInTheDocument();
    expect(
      container.querySelector('[data-chart="solar-savings-30d"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-chart="solar-savings-365d"]'),
    ).not.toBeNull();
    expect(container.querySelector(".big-read")).toHaveTextContent("1,1");
  });

  it("moves a battery limit through actions.callService", async () => {
    const user = userEvent.setup();
    const { props } = renderSolar("batteri");

    await user.click(screen.getByRole("button", { name: "Hæv Min. SoC" }));

    expect(props.actions.callService).toHaveBeenCalledWith(
      "number",
      "set_value",
      { value: 11 },
      {
        entity_id: "number.sunmate_io_pulse_ee40a0_pulse_battery_min_soc",
      },
    );
  });

  it("renders MPPT 1/2 for a pv1/pv2-only system", () => {
    const base = baseModel();
    const config = makeConfig({
      solar: {
        pv1: "sensor.inverter_pv1_power",
        pv2: "sensor.inverter_pv2_power",
        pv1Voltage: "sensor.inverter_pv1_voltage",
        pv2Voltage: "sensor.inverter_pv2_voltage",
        pv3: undefined,
        pv4: undefined,
      },
    });
    const solar = {
      ...base.solar!,
      pv1: 1200,
      pv1Voltage: 210.4,
      pv1Current: 5.7,
      pv2: 900,
      pv2Voltage: 198.2,
      pv2Current: 4.5,
      pv3: null,
      pv3Voltage: null,
      pv3Current: null,
      pv4: null,
      pv4Voltage: null,
      pv4Current: null,
    };
    const { container } = renderSolar("produktion", {
      config,
      model: { ...base, solar },
    });

    expect(screen.getAllByText("MPPT 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MPPT 2").length).toBeGreaterThan(0);
    expect(screen.getByText("Spænding 1")).toBeInTheDocument();
    expect(screen.getByText("Spænding 2")).toBeInTheDocument();
    expect(screen.queryByText("MPPT 3")).toBeNull();
    expect(screen.queryByText("MPPT 4")).toBeNull();

    const strings = container.querySelector(
      '[data-chart="solar-strings-24h"]',
    ) as HTMLElement;
    expect(strings).not.toBeNull();
    const stringsBlock = strings.closest(".block") as HTMLElement;
    expect(stringsBlock.querySelector(".legend")).toHaveTextContent("MPPT 1");
    expect(stringsBlock.querySelector(".legend")).toHaveTextContent("MPPT 2");

    const production = container.querySelector(
      '[data-chart="solar-production-forecast"]',
    ) as HTMLElement;
    expect(production.getAttribute("data-gs")).toContain("MPPT 1");
    expect(production.getAttribute("data-gs")).toContain("MPPT 2");
  });

  it("summarises production without a battery", () => {
    const base = baseModel();
    const config = makeConfig({
      solar: { batterySoc: undefined, batteryPower: undefined },
    });
    const solar = { ...base.solar!, batterySoc: null, batteryPower: null };
    const { container } = renderSolar(null, {
      config,
      model: { ...base, solar },
    });

    const summary = container.querySelector(".sheet-sum") as HTMLElement;
    expect(summary).toHaveTextContent("15,3 kWh i dag · 0 W nu");
    expect(summary).not.toHaveTextContent("batteri");
  });

  it("uses a configured currency on the payback tab", () => {
    const { container } = renderSolar("afkast", {
      config: makeConfig({ units: { currency: "EUR" } }),
    });

    const readings = container.querySelector(".readings") as HTMLElement;
    expect(within(readings).getAllByText("EUR").length).toBeGreaterThan(0);
    expect(within(readings).queryByText("kr")).toBeNull();
  });

  it("shows the calm empty state without solar data", () => {
    const base = baseModel();
    const { container } = renderSolar(null, {
      model: { ...base, solar: undefined },
    });

    expect(container.querySelector(".sheet-tabs")).toBeNull();
    expect(container.querySelector(".sheet-scroll .empty")).not.toBeNull();
    expect(screen.getAllByText("Ingen solcelledata").length).toBeGreaterThan(0);
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "Ingen solcelledata",
    );
  });
});
