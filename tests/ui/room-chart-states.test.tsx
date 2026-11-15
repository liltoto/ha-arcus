import { describe, expect, test } from "vitest";
import type { HistoryCache, HistoryStatus } from "../../src/data/history";
import { RoomBody } from "../../src/ui/organisms/layers/RoomBody";
import { makeArcusProps } from "./home-test-utils";
import { renderLayer } from "./layer-test-utils";

function historyStub(
  status: HistoryStatus = "empty",
  values: Array<number | null> = [],
): HistoryCache {
  return {
    ensure: async () => undefined,
    series: () => values,
    window: () => values,
    raw: () => [],
    status: () => status,
  } as unknown as HistoryCache;
}

/** A read-only history source without the `status` extension. */
function partialHistoryStub(): HistoryCache {
  return {
    ensure: async () => undefined,
    series: () => [],
    window: () => [],
    raw: () => [],
  } as unknown as HistoryCache;
}

describe("room chart states", () => {
  test("a present but unavailable sensor keeps its tile and marks the chart", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
      history: historyStub("empty"),
    });

    // The fixture's Stue air-quality sensors exist but report unavailable.
    const charts = container.querySelectorAll(".chart-box");
    expect(charts).toHaveLength(4);
    expect(charts[1]).toHaveAttribute("data-state", "unavailable");
    expect(charts[2]).toHaveAttribute("data-state", "unavailable");
    expect(charts[3]).toHaveAttribute("data-state", "unavailable");
    expect(charts[1].querySelector(".chart-empty")).toHaveTextContent(
      "Utilgængelig",
    );

    const readings = container.querySelectorAll(".readings .reading");
    expect(readings).toHaveLength(4);
    expect(readings[1].querySelector(".v")).toHaveTextContent("–%");
  });

  test("sensors absent from the model render no tile and no chart", () => {
    const base = makeArcusProps();
    const model = {
      ...base.model,
      rooms: base.model.rooms.map((room) =>
        room.id === "stue"
          ? { ...room, humidity: null, co2: null, pm25: null }
          : room,
      ),
    };

    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
      model,
      history: historyStub("empty"),
    });

    expect(container.querySelectorAll(".readings .reading")).toHaveLength(1);
    expect(container.querySelectorAll(".chart-box")).toHaveLength(1);
    expect(container.querySelector(".readings")).not.toHaveTextContent("PM2.5");
  });

  test("maps idle history without data to loading", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "sovevaerelse" },
      history: partialHistoryStub(),
    });

    const chart = container.querySelector(".chart-box");
    expect(chart).toHaveAttribute("data-state", "loading");
    expect(chart).toHaveAttribute("aria-busy", "true");
    expect(chart?.querySelector(".chart-empty")).toHaveTextContent("Indlæser…");
  });

  test("cached data wins over an unavailable sensor", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
      history: historyStub("ready", [4.2, 4.1, 3.9]),
    });

    const chart = container.querySelectorAll(".chart-box")[3];
    expect(chart).toHaveAttribute("data-state", "ready");
    expect(chart).not.toHaveAttribute("aria-busy");
    expect(chart.querySelector(".chart-empty")).toBeNull();
  });
});
