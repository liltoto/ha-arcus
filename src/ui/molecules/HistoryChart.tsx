import { useId, useLayoutEffect, useRef } from "react";
import { areaPath, sparkPath } from "../../render/charts";
import { applyGraph, type GraphInput } from "../../render/graph";
import type { Translator } from "../../types";
import { ChartBox } from "./ChartBox";

export interface HistoryChartSeries {
  values: Array<number | null>;
  color: string;
  label?: string;
  unit?: string;
  decimals?: number;
}

export interface HistoryChartProps {
  series: HistoryChartSeries[];
  t: Translator;
  nowMs: number;
  windowMs: number;
  unit: string;
  decimals: number;
  idPrefix: string;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 150;

/**
 * The history-backed line chart shared by the economy and tech sheets. The
 * `data-g*` attributes land on the `.chart-box` shell so the card's existing
 * hover readout keeps working.
 */
export function HistoryChart({
  series,
  t,
  nowMs,
  windowMs,
  unit,
  decimals,
  idPrefix,
}: HistoryChartProps) {
  const gradientId = `${idPrefix}-${useId().replaceAll(":", "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const hasData = series.some((entry) =>
    entry.values.some(
      (value) => typeof value === "number" && Number.isFinite(value),
    ),
  );

  const first = series[0];
  const area = first
    ? areaPath(first.values, CHART_WIDTH, CHART_HEIGHT, 2, null)
    : "";

  const graph: GraphInput = {
    start: nowMs - windowMs,
    end: nowMs,
    unit,
    decimals,
    series: series.map((entry) => ({
      label: entry.label,
      color: entry.color,
      values: entry.values,
      unit: entry.unit,
      decimals: entry.decimals,
    })),
  };

  useLayoutEffect(() => {
    const box =
      svgRef.current?.closest(".chart-box") ??
      svgRef.current?.parentElement ??
      null;
    if (!box) return;
    applyGraph(box, hasData ? graph : null);
  });

  return (
    <ChartBox noData={!hasData} emptyLabel={t("empty.chart")}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor={first?.color ?? "var(--accent)"}
              stopOpacity=".26"
            />
            <stop
              offset="1"
              stopColor={first?.color ?? "var(--accent)"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((part) => (
          <line
            key={part}
            x1="0"
            y1={CHART_HEIGHT * part}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT * part}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path fill={`url(#${gradientId})`} d={area} />
        {series.map((entry) => (
          <path
            key={entry.label ?? entry.color}
            fill="none"
            stroke={entry.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            d={sparkPath(entry.values, CHART_WIDTH, CHART_HEIGHT, 2, null)}
          />
        ))}
      </svg>
    </ChartBox>
  );
}
