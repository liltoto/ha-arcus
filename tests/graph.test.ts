import { afterEach, describe, expect, test, vi } from "vitest";
import { formatTime } from "../src/format";
import {
  applyGraph,
  graphAttrs,
  mountGraphTips,
  parseGraph,
  type GraphInput,
} from "../src/render/graph";

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

const RECT: DOMRect = {
  left: 0,
  top: 0,
  width: 200,
  height: 100,
  right: 200,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.useRealTimers();
});

interface MountedChart {
  root: ShadowRoot;
  chart: HTMLElement;
  parent: HTMLElement;
  dispose(): void;
}

function mountChart(
  input: GraphInput,
  options: { app?: boolean } = {},
): MountedChart {
  const host = document.createElement("div");
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const parent = document.createElement("div");
  if (options.app !== false) parent.className = "app";
  root.append(parent);
  const chart = elementWith(graphAttrs(input));
  chart.getBoundingClientRect = () => RECT;
  parent.append(chart);
  const tips = mountGraphTips(root, () => "en");

  const dispose = (): void => {
    tips.destroy();
    host.remove();
  };
  cleanups.push(dispose);
  return { root, chart, parent, dispose };
}

function pointer(
  target: EventTarget,
  type: string,
  init: PointerEventInit = {},
): PointerEvent {
  const event = new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerType: "mouse",
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function tipOf(root: ShadowRoot): HTMLElement {
  return root.querySelector<HTMLElement>("[data-graph-tip]")!;
}

function cursorOf(root: ShadowRoot): HTMLElement {
  return root.querySelector<HTMLElement>("[data-graph-cursor]")!;
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

describe("graph tips", () => {
  test("mouse move creates the tip, cursor and hovered value", () => {
    const { root, chart, parent, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [10, 20, 30] }],
    });

    expect(root.querySelector("[data-graph-tip]")).toBeNull();
    expect(root.querySelector("[data-graph-cursor]")).toBeNull();

    pointer(chart, "pointermove", { clientX: 100 });

    const tip = tipOf(root);
    const cursor = cursorOf(root);
    expect(parent.contains(tip)).toBe(true);
    expect(tip).toHaveClass("show");
    expect(cursor).toHaveClass("show");
    expect(tip.textContent).toBe("20 W");
    expect(cursor.style.left).toBe("100px");
    expect(cursor.style.top).toBe("0px");
    expect(cursor.style.height).toBe("100px");

    pointer(chart, "pointermove", { clientX: 200 });
    expect(root.querySelectorAll("[data-graph-tip]")).toHaveLength(1);
    expect(tip.textContent).toBe("30 W");

    dispose();
  });

  test("single-point charts center the readout and hide on leave", () => {
    const { root, chart, parent, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [5] }],
    });

    pointer(chart, "pointermove", { clientX: 0 });

    const tip = tipOf(root);
    const cursor = cursorOf(root);
    expect(tip.textContent).toBe("5 W");
    expect(cursor.style.left).toBe("100px");

    pointer(parent, "pointermove", { clientX: 0 });

    expect(tip).not.toHaveClass("show");
    expect(cursor).not.toHaveClass("show");

    dispose();
  });

  test("multi-series tips show each label, value and dot color", () => {
    const { root, chart, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [
        { label: "Sol", color: "var(--amber)", values: [1, 2, 3] },
        { label: "Hus", color: "var(--sky)", values: [3, 2, 1] },
      ],
    });

    pointer(chart, "pointermove", { clientX: 200 });

    const tip = tipOf(root);
    const rows = tip.querySelectorAll<HTMLElement>(".gt-row");
    const labels = tip.querySelectorAll<HTMLElement>(".gt-l");
    const values = tip.querySelectorAll<HTMLElement>(".gt-v");
    const dots = tip.querySelectorAll<HTMLElement>(".gt-dot");

    expect(rows).toHaveLength(2);
    expect(labels[0].textContent).toBe("Sol");
    expect(labels[1].textContent).toBe("Hus");
    expect(values[0].textContent).toBe("3 W");
    expect(values[1].textContent).toBe("1 W");
    expect(dots[0].style.getPropertyValue("--c")).toBe("var(--amber)");
    expect(dots[1].style.getPropertyValue("--c")).toBe("var(--sky)");

    dispose();
  });

  test("timed tips snap to the nearest point", () => {
    const { root, chart, dispose } = mountChart({
      mode: "timed",
      points: [
        { t: 0, v: 10 },
        { t: 1_000, v: 20 },
        { t: 3_000, v: 30 },
      ],
      unit: "W",
      decimals: 0,
    });

    pointer(chart, "pointermove", { clientX: 120 });

    const tip = tipOf(root);
    const cursor = cursorOf(root);
    expect(tip.textContent).toContain("20 W");
    expect(tip.querySelector(".gt-t")?.textContent).toMatch(/^\d{2}:\d{2}$/);
    // Nearest point is t=1000 of the 0..3000 window: 200 * 1000 / 3000.
    expect(cursor.style.left).toBe("67px");

    dispose();
  });

  test("bars tips pick a bucket and stay inside the chart", () => {
    const { root, chart, dispose } = mountChart({
      mode: "bars",
      start: 0,
      end: 40,
      unit: "kWh",
      decimals: 1,
      series: [{ values: [1, 2, 3, 4] }],
    });

    pointer(chart, "pointermove", { clientX: -40 });

    const tip = tipOf(root);
    const cursor = cursorOf(root);
    expect(tip.textContent).toContain("1.0 kWh");
    expect(cursor.style.left).toBe("25px");

    pointer(chart, "pointermove", { clientX: 400 });
    expect(tip.textContent).toContain("4.0 kWh");
    expect(cursor.style.left).toBe("175px");
    expect(parseFloat(tip.style.left)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(tip.style.left)).toBeLessThanOrEqual(200);
    expect(parseFloat(cursor.style.left)).toBeLessThanOrEqual(200);

    dispose();
  });

  test("multi-series bars use the cursor bucket for every row", () => {
    const start = Date.UTC(2026, 0, 1, 0, 0);
    const { root, chart, dispose } = mountChart({
      mode: "bars",
      start,
      end: start + 4 * 60 * 60 * 1000,
      unit: "kWh",
      decimals: 0,
      series: [
        { label: "Sol", values: [10, 20, 30, 40] },
        { label: "Hus", values: [1, 2, 3, 4] },
      ],
    });

    // 40 of 200 px floors to bucket 0, while nearest-point rounding would
    // pick bucket 1.
    pointer(chart, "pointermove", { clientX: 40 });

    const tip = tipOf(root);
    const values = tip.querySelectorAll<HTMLElement>(".gt-v");
    expect(values).toHaveLength(2);
    expect(values[0].textContent).toBe("10 kWh");
    expect(values[1].textContent).toBe("1 kWh");
    expect(cursorOf(root).style.left).toBe("25px");
    expect(tip.querySelector(".gt-t")?.textContent).toBe(
      formatTime(start, "en"),
    );

    dispose();
  });

  test("mouse pointerdown hides the readout", () => {
    const { root, chart, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [10, 20, 30] }],
    });

    pointer(chart, "pointermove", { clientX: 100 });
    expect(tipOf(root)).toHaveClass("show");
    expect(cursorOf(root)).toHaveClass("show");

    pointer(chart, "pointerdown", { clientX: 100 });

    expect(tipOf(root)).not.toHaveClass("show");
    expect(cursorOf(root)).not.toHaveClass("show");

    dispose();
  });

  test("touch tap and drag show the readout until release", () => {
    const { root, chart, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [10, 20, 30] }],
    });

    pointer(chart, "pointerdown", {
      pointerType: "touch",
      clientX: 100,
    });
    const tip = tipOf(root);
    expect(tip).toHaveClass("show");
    expect(tip.textContent).toBe("20 W");

    pointer(chart, "pointermove", {
      pointerType: "touch",
      clientX: 200,
    });
    expect(tip.textContent).toBe("30 W");

    pointer(chart, "pointerup", { pointerType: "touch", clientX: 200 });
    // The tap's own pointerup starts the 2.5s hide window; it is not instant.
    expect(tip).toHaveClass("show");

    dispose();
  });

  test("touch readout auto-hides after 2.5 seconds", () => {
    vi.useFakeTimers();
    const { root, chart, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [10, 20, 30] }],
    });

    pointer(chart, "pointerdown", {
      pointerType: "touch",
      clientX: 100,
    });
    pointer(chart, "pointerup", { pointerType: "touch", clientX: 100 });
    const tip = tipOf(root);
    const cursor = cursorOf(root);
    expect(tip).toHaveClass("show");

    vi.advanceTimersByTime(2_499);
    expect(tip).toHaveClass("show");

    vi.advanceTimersByTime(1);
    expect(tip).not.toHaveClass("show");
    expect(cursor).not.toHaveClass("show");

    dispose();
    vi.useRealTimers();
  });

  test("window scroll hides the readout", () => {
    const { root, chart, dispose } = mountChart(
      {
        start: 0,
        end: 0,
        unit: "W",
        decimals: 0,
        series: [{ values: [10, 20, 30] }],
      },
      { app: false },
    );

    pointer(chart, "pointermove", { clientX: 100 });
    const tip = tipOf(root);
    expect(tip.parentNode).toBe(root);
    expect(tip).toHaveClass("show");

    window.dispatchEvent(new Event("scroll"));

    expect(tip).not.toHaveClass("show");

    dispose();
  });

  test("destroy removes listeners and clears the readout", () => {
    const { root, chart, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [10, 20, 30] }],
    });

    pointer(chart, "pointermove", { clientX: 100 });
    const tip = tipOf(root);
    const cursor = cursorOf(root);
    expect(tip).toHaveClass("show");
    const content = tip.textContent;

    dispose();

    expect(tip).not.toHaveClass("show");
    expect(cursor).not.toHaveClass("show");

    pointer(chart, "pointermove", { clientX: 200 });
    expect(tip).not.toHaveClass("show");
    expect(tip.textContent).toBe(content);
  });

  test("a touch tap swallows the click that follows", () => {
    const { chart, dispose } = mountChart({
      start: 0,
      end: 0,
      unit: "W",
      decimals: 0,
      series: [{ values: [10, 20, 30] }],
    });
    const click = vi.fn();
    chart.addEventListener("click", click);

    const down = pointer(chart, "pointerdown", {
      pointerType: "touch",
      clientX: 100,
    });
    expect(down.defaultPrevented).toBe(true);

    const first = new MouseEvent("click", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    chart.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    expect(click).not.toHaveBeenCalled();

    const second = new MouseEvent("click", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    chart.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);

    dispose();
  });
});
