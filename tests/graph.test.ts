import { describe, expect, test } from "vitest";
import { applyGraph, graphAttrs, parseGraph } from "../src/render/graph";

function elementWith(attrs: string): HTMLElement {
  const element = document.createElement("div");
  for (const match of attrs.matchAll(/(data-[a-z0-9]+)="([^"]*)"/g)) {
    element.setAttribute(
      match[1],
      match[2].replaceAll("&quot;", '"').replaceAll("&amp;", "&"),
    );
  }
  return element;
}

describe("graph attributes", () => {
  test("single series round-trips values, unit and window", () => {
    const attrs = graphAttrs({
      start: 1_000,
      end: 2_000,
      unit: "°C",
      decimals: 1,
      series: [{ values: [21.25, null, 22] }],
    });
    const graph = parseGraph(elementWith(attrs));

    expect(graph).not.toBeNull();
    expect(graph?.mode).toBe("line");
    expect(graph?.start).toBe(1_000);
    expect(graph?.end).toBe(2_000);
    expect(graph?.series).toHaveLength(1);
    expect(graph?.series[0].values).toEqual([21.25, null, 22]);
    expect(graph?.series[0].unit).toBe("°C");
    expect(graph?.series[0].decimals).toBe(1);
  });

  test("multiple series keep label, color and per-series units", () => {
    const attrs = graphAttrs({
      start: 0,
      end: 10,
      series: [
        { label: "Sol", color: "var(--amber)", values: [0, 4, 8], unit: "W" },
        { label: "Hus", color: "var(--sky)", values: [2, 2, 2], unit: "W" },
      ],
    });
    const graph = parseGraph(elementWith(attrs));

    expect(graph?.series).toHaveLength(2);
    expect(graph?.series[0]).toMatchObject({
      label: "Sol",
      color: "var(--amber)",
      unit: "W",
    });
    expect(graph?.series[1].values).toEqual([2, 2, 2]);
  });

  test("timed points round-trip and sort by time", () => {
    const attrs = graphAttrs({
      mode: "timed",
      points: [
        { t: 2_000, v: 4 },
        { t: 1_000, v: 2 },
      ],
      unit: "W",
      decimals: 0,
    });
    const graph = parseGraph(elementWith(attrs));

    expect(graph?.mode).toBe("timed");
    expect(graph?.points?.map((point) => point.t)).toEqual([1_000, 2_000]);
    expect(graph?.series[0].values).toEqual([2, 4]);
  });

  test("applyGraph replaces and clears stale attributes", () => {
    const element = document.createElement("div");
    applyGraph(element, {
      start: 0,
      end: 10,
      series: [{ values: [1, 2] }],
    });
    expect(element.getAttribute("data-graph")).toBe("line");
    expect(element.getAttribute("data-gv")).toBe("1;2");

    applyGraph(element, null);
    expect(element.getAttribute("data-graph")).toBeNull();
    expect(element.getAttribute("data-gv")).toBeNull();
  });

  test("missing or malformed data is ignored", () => {
    expect(parseGraph(document.createElement("div"))).toBeNull();

    const element = document.createElement("div");
    element.setAttribute("data-graph", "line");
    element.setAttribute("data-gs", "not-json");
    expect(parseGraph(element)).toBeNull();
  });
});
