import { useEffect, useId, useRef } from "react";
import { areaPath, sparkPath } from "../../render/charts";
import { applyGraph, type GraphInput } from "../../render/graph";
import type { Translator } from "../../types";
import { ChartBox } from "./ChartBox";
import { ChartScaffold } from "./ChartScaffold";

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
export const HistoryChart = ({
  series,
  t,
  nowMs,
  windowMs,
  unit,
  decimals,
  idPrefix,
}: HistoryChartProps) => {
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

  useEffect(() => {
    const box =
      svgRef.current?.closest(".chart-box") ??
      svgRef.current?.parentElement ??
      null;
    if (!box) return;
    applyGraph(box, hasData ? graph : null);
  });

  return (
    <ChartBox state={hasData ? "ready" : "empty"} emptyLabel={t("empty.chart")}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <ChartScaffold
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          gradientId={gradientId}
          color={first?.color}
        />
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
};
