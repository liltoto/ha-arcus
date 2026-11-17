import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { HistoryCache, SeriesOptions } from "../../../src/data/history";
import { parseGraph } from "../../../src/render/graph";
import { resolveRange, startOfDay } from "../../../src/range";
import { EnergyBody } from "../../../src/ui/organisms/layers/EnergyBody";
import { renderLayer } from "../layer-test-utils";
import { makeArcusProps } from "../home-test-utils";
import { makeConfig } from "../../fixtures/home";

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

  test("uses a configured currency for prices and units", () => {
    const { container } = renderLayer(EnergyBody, {
      config: makeConfig({ units: { currency: "EUR" } }),
    });

    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "1,75 EUR/kWh",
    );
    const big = container.querySelector(".big-read");
    expect(big).toHaveTextContent("1,75");
    expect(big?.querySelector("small")).toHaveTextContent("EUR/kWh");
    expect(
      container.querySelector(".big-read + .block-note"),
    ).toHaveTextContent("salgspris 1,10 EUR");

    const readings = container.querySelectorAll(".readings .reading");
    expect(readings[0]).toHaveTextContent("EUR");
    expect(readings[3]).toHaveTextContent("EUR");
    expect(container.querySelector(".bar-chart")).toHaveAttribute(
      "data-gu",
      "EUR",
    );
  });

  test("supports a currency symbol", () => {
    const { container } = renderLayer(EnergyBody, {
      config: makeConfig({ units: { currency: "$" } }),
    });

    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "1,75 $/kWh",
    );
    expect(container.querySelector(".big-read small")).toHaveTextContent(
      "$/kWh",
    );
    expect(container.querySelector(".bar-chart")).toHaveAttribute(
      "data-gu",
      "$",
    );
  });

  test("renders the optional EV and appliance blocks", () => {
    renderLayer(EnergyBody, {
      config: makeConfig({
        energy: {
          ev: {
            name: "Tesla",
            plugged: "binary_sensor.tesla_wall_connector_koretoj_tilsluttet",
            power: "sensor.tesla_wall_connector_total_power",
            session: "sensor.tesla_wall_connector_energi_til_sessionen",
            total: "sensor.tesla_wall_connector_energi",
          },
          standby: "sensor.all_standby_power",
          appliances: [
            {
              name: "Fryser",
              entity: "sensor.grillplats_plug_effekt",
              icon: "snow",
            },
            { name: "Server", entity: "sensor.grillplats_plug_effekt_2" },
          ],
        },
      }),
    });

    expect(screen.getByText("Tesla")).toBeInTheDocument();
    expect(screen.getByText("ikke tilsluttet")).toBeInTheDocument();

    const ev = screen.getByText("Tesla").closest(".block") as HTMLElement;
    expect(within(ev).getByText("Effekt")).toBeInTheDocument();
    expect(within(ev).getByText("Session")).toBeInTheDocument();
    expect(within(ev).getByText("Total")).toBeInTheDocument();
    expect(ev).toHaveTextContent("1.420");

    expect(screen.getByText("Apparater")).toBeInTheDocument();
    expect(screen.getByText("3,2 kWh standby")).toBeInTheDocument();
    expect(screen.getByText("Fryser")).toBeInTheDocument();
    expect(screen.getByText("Server")).toBeInTheDocument();

    const appliances = screen
      .getByText("Apparater")
      .closest(".block") as HTMLElement;
    expect(appliances.querySelectorAll(".row")).toHaveLength(2);
    expect(appliances).toHaveTextContent("24");
    expect(appliances).toHaveTextContent("69");
    expect(appliances.querySelectorAll(".row svg.ico")).toHaveLength(2);
  });

  test("rewinds the price and device charts to a past range", () => {
    const nowDate = new Date("2026-11-13T01:19:00+01:00");
    const range = resolveRange(
      {
        anchor: startOfDay(new Date("2026-11-12T12:00:00+01:00")),
        days: 1,
      },
      nowDate,
    );
    const series = vi.fn((_entityId: string, _options?: SeriesOptions) =>
      Array.from({ length: 24 }, (_, index) => 1 + index / 100),
    );
    const history = {
      ensure: async () => undefined,
      series,
      window: () => [],
      raw: () => [],
      status: () => "ready",
      rangeStatus: () => "ready",
    } as unknown as HistoryCache;

    const { container } = renderLayer(EnergyBody, {
      config: makeConfig({
        energy: {
          standby: "sensor.all_standby_power",
          ev: {
            name: "Tesla",
            power: "sensor.tesla_wall_connector_total_power",
          },
          appliances: [
            {
              name: "Fryser",
              entity: "sensor.grillplats_plug_effekt",
              icon: "snow",
            },
          ],
        },
      }),
      history,
      now: () => nowDate,
      range,
    });

    expect(series).toHaveBeenCalledWith("sensor.electricity_total_price", {
      start: range.start,
      end: range.end,
      buckets: 24,
      fill: null,
    });

    const bars = container.querySelector<HTMLElement>(".bar-chart");
    expect(bars).not.toBeNull();
    expect(bars).toHaveAttribute("data-gt0", String(range.start));
    expect(bars).toHaveAttribute("data-gt1", String(range.end));
    expect(bars!.querySelectorAll("i")).toHaveLength(24);
    expect(bars!.querySelector("i.now")).toBeNull();
    expect(parseGraph(bars!)?.series[0]?.values[0]).toBeCloseTo(1, 5);

    expect(series).toHaveBeenCalledWith("sensor.grillplats_plug_effekt", {
      start: range.start,
      end: range.end,
      buckets: 96,
      fill: "hold",
    });

    const charts = container.querySelectorAll(".chart-box");
    expect(charts).toHaveLength(3);
    for (const chart of charts) {
      expect(chart).toHaveAttribute("data-gt0", String(range.start));
      expect(chart).toHaveAttribute("data-gt1", String(range.end));
    }
    expect(screen.getByText(/^Fryser · /)).toBeInTheDocument();
  });

  test.each([
    ["failed", "Utilgængelig"],
    ["idle", "Indlæser…"],
    ["loading", "Indlæser…"],
    ["empty", "Ingen data"],
  ] as const)(
    "shows the %s recorder state for a purged price day",
    (status, label) => {
      const nowDate = new Date("2026-11-13T01:19:00+01:00");
      const range = resolveRange(
        {
          anchor: startOfDay(new Date("2026-11-12T12:00:00+01:00")),
          days: 1,
        },
        nowDate,
      );
      const history = {
        ensure: async () => undefined,
        series: () => [],
        window: () => [],
        raw: () => [],
        status: () => status,
        rangeStatus: () => status,
      } as unknown as HistoryCache;

      renderLayer(EnergyBody, {
        history,
        now: () => nowDate,
        range,
      });

      const block = screen.getByText("Døgnets priser").closest(".block");
      expect(block).toHaveTextContent(label);
    },
  );

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
