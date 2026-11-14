import { formatNumber, formatTime } from "../format";
import type { Language } from "../types";

/**
 * Hover readouts for the small charts.
 *
 * Charts carry their plotted series as compact `data-g*` attributes, so the
 * readout always matches what was drawn, survives re-renders, and needs no
 * registry shared between the card, the home view and the sheet layers.
 */
export type GraphMode = "line" | "bars" | "timed";

export interface GraphPoint {
  t: number;
  v: number | null;
}

export interface GraphSeriesInput {
  label?: string;
  color?: string;
  values: Array<number | null>;
  unit?: string;
  decimals?: number;
}

export interface GraphInput {
  mode?: GraphMode;
  /** Plot window for line/bar charts, epoch milliseconds. */
  start?: number;
  end?: number;
  /** Timed points for charts whose x axis is a clock/date axis. */
  points?: GraphPoint[];
  unit?: string;
  decimals?: number;
  series?: GraphSeriesInput[];
}

export interface ParsedSeries {
  label: string;
  color: string;
  values: Array<number | null>;
  unit: string;
  decimals: number;
}

export interface ParsedGraph {
  mode: GraphMode;
  series: ParsedSeries[];
  points: GraphPoint[] | null;
  start: number;
  end: number;
}

const GRAPH_ATTRS = ["graph", "gv", "gs", "gp", "gt0", "gt1", "gu", "gd"];

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function encodeValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 10000) / 10000);
}

function encodeValues(values: Array<number | null>): string {
  return values.map(encodeValue).join(";");
}

function decodeValues(raw: string | null): Array<number | null> {
  if (!raw) return [];
  return raw.split(";").map((part) => {
    if (!part) return null;
    const value = Number(part);
    return Number.isFinite(value) ? value : null;
  });
}

function decodePoints(raw: string | null): GraphPoint[] {
  if (!raw) return [];
  const points: GraphPoint[] = [];
  for (const part of raw.split(";")) {
    const [time, value] = part.split(":");
    const t = Number(time);
    if (!Number.isFinite(t)) continue;
    const v = value === "" || value === undefined ? null : Number(value);
    points.push({ t, v: v !== null && Number.isFinite(v) ? v : null });
  }
  return points.sort((a, b) => a.t - b.t);
}

/** Attributes for a chart element. */
export function graphAttrs(input: GraphInput): string {
  const dataset = graphDataset(input);
  return Object.entries(dataset)
    .map(([key, value]) => `data-${key}="${escapeAttr(value)}"`)
    .join(" ");
}

/** Assign the attributes in place; used when the card redraws a spark. */
export function applyGraph(element: Element, input: GraphInput | null): void {
  for (const name of GRAPH_ATTRS) element.removeAttribute(`data-${name}`);
  if (!input) return;
  for (const [key, value] of Object.entries(graphDataset(input))) {
    element.setAttribute(`data-${key}`, value);
  }
}

function graphDataset(input: GraphInput): Record<string, string> {
  const mode = input.mode ?? "line";
  const dataset: Record<string, string> = { graph: mode };
  const series = input.series ?? [];

  if (mode === "timed" && input.points?.length) {
    dataset.gp = input.points
      .map((point) => `${Math.round(point.t)}:${encodeValue(point.v)}`)
      .join(";");
    const first = input.points[0]?.t;
    const last = input.points[input.points.length - 1]?.t;
    if (Number.isFinite(input.start) || Number.isFinite(first)) {
      dataset.gt0 = String(Math.round(input.start ?? first ?? 0));
    }
    if (Number.isFinite(input.end) || Number.isFinite(last)) {
      dataset.gt1 = String(Math.round(input.end ?? last ?? 0));
    }
    dataset.gu = input.unit ?? "";
    dataset.gd = String(input.decimals ?? 0);
    return dataset;
  }

  if (series.length > 1) {
    dataset.gs = JSON.stringify(
      series.map((entry) => ({
        l: entry.label ?? "",
        c: entry.color ?? "",
        v: encodeValues(entry.values),
        u: entry.unit ?? input.unit ?? "",
        d: entry.decimals ?? input.decimals ?? 0,
      })),
    );
  } else if (series.length === 1) {
    dataset.gv = encodeValues(series[0].values);
    dataset.gu = series[0].unit ?? input.unit ?? "";
    dataset.gd = String(series[0].decimals ?? input.decimals ?? 0);
  }

  if (Number.isFinite(input.start)) {
    dataset.gt0 = String(Math.round(input.start as number));
  }
  if (Number.isFinite(input.end)) {
    dataset.gt1 = String(Math.round(input.end as number));
  }
  return dataset;
}

/** Read the attributes back when the pointer enters a chart. */
export function parseGraph(element: Element): ParsedGraph | null {
  const mode = element.getAttribute("data-graph");
  if (mode !== "line" && mode !== "bars" && mode !== "timed") return null;

  const unit = element.getAttribute("data-gu") ?? "";
  const decimals = Number(element.getAttribute("data-gd") ?? 0);
  const start = Number(element.getAttribute("data-gt0") ?? 0);
  const end = Number(element.getAttribute("data-gt1") ?? 0);

  if (mode === "timed") {
    const points = decodePoints(element.getAttribute("data-gp"));
    if (!points.length) return null;
    return {
      mode,
      points,
      series: [
        {
          label: "",
          color: "",
          values: points.map((point) => point.v),
          unit,
          decimals: Number.isFinite(decimals) ? decimals : 0,
        },
      ],
      start: Number.isFinite(start) ? start : points[0].t,
      end: Number.isFinite(end) ? end : points[points.length - 1].t,
    };
  }

  const rawSeries = element.getAttribute("data-gs");
  if (rawSeries) {
    try {
      const parsed = JSON.parse(rawSeries) as Array<{
        l?: string;
        c?: string;
        v?: string;
        u?: string;
        d?: number;
      }>;
      const series = parsed
        .map((entry) => ({
          label: String(entry.l ?? ""),
          color: String(entry.c ?? ""),
          values: decodeValues(entry.v ?? ""),
          unit: String(entry.u ?? unit),
          decimals: Number.isFinite(entry.d) ? Number(entry.d) : decimals,
        }))
        .filter((entry) => entry.values.length > 0);
      if (!series.length) return null;
      return {
        mode,
        points: null,
        series,
        start: Number.isFinite(start) ? start : 0,
        end: Number.isFinite(end) ? end : 0,
      };
    } catch {
      return null;
    }
  }

  const values = decodeValues(element.getAttribute("data-gv"));
  if (!values.length) return null;
  return {
    mode,
    points: null,
    series: [
      {
        label: "",
        color: "",
        values,
        unit,
        decimals: Number.isFinite(decimals) ? decimals : 0,
      },
    ],
    start: Number.isFinite(start) ? start : 0,
    end: Number.isFinite(end) ? end : 0,
  };
}

function indexAt(fraction: number, length: number, mode: GraphMode): number {
  if (length <= 0) return 0;
  if (mode === "bars") {
    return Math.min(length - 1, Math.max(0, Math.floor(fraction * length)));
  }
  return Math.min(length - 1, Math.max(0, Math.round(fraction * (length - 1))));
}

function valueText(
  value: number | null,
  decimals: number,
  unit: string,
  language: Language | string,
): string {
  const formatted = formatNumber(value, decimals, language);
  return unit ? `${formatted} ${unit}` : formatted;
}

function graphTime(
  timestamp: number,
  span: number,
  language: Language | string,
): string {
  if (!Number.isFinite(timestamp)) return "";
  if (span <= 50 * 60 * 60 * 1000) return formatTime(timestamp, language);
  const locale = String(language ?? "da")
    .toLowerCase()
    .startsWith("da")
    ? "da-DK"
    : "en-GB";
  const date = new Date(timestamp);
  if (span <= 10 * 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat(locale, { weekday: "short" })
      .format(date)
      .replace(/\.$/, "");
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
    .format(date)
    .replace(/\.$/, "");
}

interface TipElements {
  tip: HTMLElement;
  cursor: HTMLElement;
}

function tipElements(root: ShadowRoot): TipElements | null {
  let tip = root.querySelector<HTMLElement>("[data-graph-tip]");
  let cursor = root.querySelector<HTMLElement>("[data-graph-cursor]");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "graph-tip";
    tip.setAttribute("data-graph-tip", "");
    tip.setAttribute("aria-hidden", "true");
    const app = root.querySelector(".app") ?? root;
    app.appendChild(tip);
  }
  if (!cursor) {
    cursor = document.createElement("div");
    cursor.className = "graph-cursor";
    cursor.setAttribute("data-graph-cursor", "");
    cursor.setAttribute("aria-hidden", "true");
    const app = root.querySelector(".app") ?? root;
    app.appendChild(cursor);
  }
  return { tip, cursor };
}

function fillTip(
  tip: HTMLElement,
  graph: ParsedGraph,
  index: number,
  fraction: number,
  timestamp: number,
  language: Language | string,
): void {
  const fragment = document.createDocumentFragment();
  if (graph.series.length > 1) {
    for (const entry of graph.series) {
      const row = document.createElement("span");
      row.className = "gt-row";
      const dot = document.createElement("i");
      dot.className = "gt-dot";
      if (entry.color) dot.style.setProperty("--c", entry.color);
      row.append(dot);
      if (entry.label) {
        const label = document.createElement("span");
        label.className = "gt-l";
        label.textContent = entry.label;
        row.append(label);
      }
      const value = document.createElement("b");
      value.className = "gt-v";
      value.textContent = valueText(
        entry.values[indexAt(fraction, entry.values.length, "line")] ?? null,
        entry.decimals,
        entry.unit,
        language,
      );
      row.append(value);
      fragment.append(row);
    }
  } else {
    const entry = graph.series[0];
    const value = document.createElement("b");
    value.textContent = valueText(
      entry.values[index] ?? null,
      entry.decimals,
      entry.unit,
      language,
    );
    fragment.append(value);
  }

  const span = graph.end - graph.start;
  const time =
    span > 0 && Number.isFinite(timestamp)
      ? graphTime(timestamp, span, language)
      : "";
  if (time) {
    const clock = document.createElement("span");
    clock.className = "gt-t";
    clock.textContent = time;
    fragment.append(clock);
  }

  tip.replaceChildren(fragment);
}

/** Bind one hover/touch readout for every chart inside `root`. */
export function mountGraphTips(
  root: ShadowRoot,
  language: () => Language | string,
): { destroy(): void } {
  let active = false;
  let touchChart: HTMLElement | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let suppressClick = false;

  const hideNow = (): void => {
    if (!active) return;
    active = false;
    const tip = root.querySelector<HTMLElement>("[data-graph-tip]");
    const cursor = root.querySelector<HTMLElement>("[data-graph-cursor]");
    tip?.classList.remove("show");
    cursor?.classList.remove("show");
  };

  const clearHide = (): void => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  };

  const scheduleHide = (): void => {
    clearHide();
    hideTimer = setTimeout(() => {
      hideTimer = null;
      hideNow();
    }, 2500);
  };

  const showAt = (chart: HTMLElement, clientX: number): boolean => {
    const graph = parseGraph(chart);
    if (!graph) return false;
    const rect = chart.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 2) return false;

    const elements = tipElements(root);
    if (!elements) return false;
    clearHide();

    const fraction = Math.min(
      1,
      Math.max(0, (clientX - rect.left) / rect.width),
    );
    const primary = graph.series[0];
    let index: number;
    let x: number;
    let timestamp: number;

    if (graph.mode === "timed" && graph.points) {
      const points = graph.points;
      const span = Math.max(1, graph.end - graph.start);
      const at = graph.start + fraction * span;
      let nearest = 0;
      for (let i = 1; i < points.length; i++) {
        if (Math.abs(points[i].t - at) < Math.abs(points[nearest].t - at)) {
          nearest = i;
        }
      }
      index = nearest;
      timestamp = points[nearest].t;
      x = rect.left + ((points[nearest].t - graph.start) / span) * rect.width;
    } else if (graph.mode === "bars") {
      index = indexAt(fraction, primary.values.length, "bars");
      const span = Math.max(1, graph.end - graph.start);
      timestamp = graph.start + (index / primary.values.length) * span;
      x = rect.left + ((index + 0.5) / primary.values.length) * rect.width;
    } else {
      index = indexAt(fraction, primary.values.length, "line");
      const span = graph.end - graph.start;
      timestamp =
        primary.values.length > 1
          ? graph.start + (index / (primary.values.length - 1)) * span
          : graph.start;
      x =
        rect.left +
        (primary.values.length > 1
          ? (index / (primary.values.length - 1)) * rect.width
          : rect.width / 2);
    }

    fillTip(elements.tip, graph, index, fraction, timestamp, language());
    elements.tip.classList.add("show");
    const width = elements.tip.offsetWidth;
    const height = elements.tip.offsetHeight;
    let left = x + 14;
    if (left + width > window.innerWidth - 8) left = x - width - 14;
    if (left < 8) left = 8;
    let top = rect.top - height - 10;
    if (top < 8) top = rect.bottom + 10;
    if (top + height > window.innerHeight - 8) {
      top = window.innerHeight - height - 8;
    }
    elements.tip.style.left = `${Math.round(left)}px`;
    elements.tip.style.top = `${Math.round(top)}px`;

    elements.cursor.style.left = `${Math.round(x)}px`;
    elements.cursor.style.top = `${Math.round(rect.top)}px`;
    elements.cursor.style.height = `${Math.round(rect.height)}px`;
    elements.cursor.classList.add("show");
    active = true;
    return true;
  };

  const onMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType && pointer.pointerType !== "mouse") {
      if (touchChart) showAt(touchChart, pointer.clientX);
      return;
    }
    const target = event.target as Element | null;
    const chart = target?.closest?.("[data-graph]") as HTMLElement | null;
    if (!chart) {
      hideNow();
      return;
    }
    showAt(chart, pointer.clientX);
  };

  const onPointerDown = (event: Event): void => {
    const pointer = event as PointerEvent;
    const target = event.target as Element | null;

    if (pointer.pointerType && pointer.pointerType !== "mouse") {
      const chart = target?.closest?.("[data-graph]") as HTMLElement | null;
      if (!chart) {
        touchChart = null;
        suppressClick = false;
        hideNow();
        return;
      }
      touchChart = chart;
      suppressClick = true;
      if (showAt(chart, pointer.clientX)) event.preventDefault();
      return;
    }

    // A mouse click hides the hover readout, as before.
    suppressClick = false;
    hideNow();
  };

  const endTouch = (): void => {
    if (!touchChart) return;
    touchChart = null;
    scheduleHide();
  };

  const cancelTouch = (): void => {
    touchChart = null;
    suppressClick = false;
    scheduleHide();
  };

  const onClickCapture = (event: Event): void => {
    if (!suppressClick) return;
    suppressClick = false;
    // The tap was used to reveal the chart readout; do not also activate the
    // card/button that contains the chart.
    event.preventDefault();
    event.stopPropagation();
  };

  const onHostLeave = (): void => {
    // Touch taps release the finger and then emit pointerleave. Keep the
    // readout visible for the short touch-hide window instead of clearing it
    // the moment the tap lands.
    if (touchChart || hideTimer) return;
    hideNow();
  };

  const onScroll = (): void => {
    touchChart = null;
    suppressClick = false;
    hideNow();
  };

  root.addEventListener("pointermove", onMove, { passive: false });
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerup", endTouch);
  root.addEventListener("pointercancel", cancelTouch);
  window.addEventListener("pointerup", endTouch, true);
  window.addEventListener("pointercancel", cancelTouch, true);
  root.addEventListener("click", onClickCapture, true);
  root.host.addEventListener("pointerleave", onHostLeave);
  window.addEventListener("scroll", onScroll, true);

  return {
    destroy(): void {
      clearHide();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", endTouch);
      root.removeEventListener("pointercancel", cancelTouch);
      window.removeEventListener("pointerup", endTouch, true);
      window.removeEventListener("pointercancel", cancelTouch, true);
      root.removeEventListener("click", onClickCapture, true);
      root.host.removeEventListener("pointerleave", onHostLeave);
      window.removeEventListener("scroll", onScroll, true);
      hideNow();
    },
  };
}
