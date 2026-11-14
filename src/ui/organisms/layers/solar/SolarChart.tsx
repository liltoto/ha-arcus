import { useEffect, useRef } from "react";
import { areaPath, sparkPath } from "../../../../render/charts";
import { applyGraph, type GraphInput } from "../../../../render/graph";
import { DAY_MS, escapeHtml, isFiniteNumber } from "./helpers";

export interface SolarSeries {
  key: string;
  values: Array<number | null>;
  color: string;
  label?: string;
  unit?: string;
  decimals?: number;
}

export interface SolarChartProps {
  chart: string;
  series: SolarSeries[];
  height: number;
  now: Date;
  empty: string;
  shared?: boolean;
  start?: number;
  end?: number;
  unit?: string;
  decimals?: number;
}

const WIDTH = 560;

/**
 * The chart shell used by every solar tab.
 *
 * It keeps the legacy `.chart-box` markup: the `data-graph` hover dataset is
 * attached to the frame (not the svg), the plotted lines carry
 * `data-chart-line` keys the card can redraw from history, and the first
 * series owns the area fill and gradient. `applyGraph` writes the dataset
 * after mount because the graph helpers own attribute encoding.
 */
export function SolarChart({
  chart,
  series,
  height,
  now,
  empty,
  shared: sharedOption,
  start,
  end,
  unit,
  decimals,
}: SolarChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shared = sharedOption ?? series.length > 1;
  const valid = series.flatMap((item) => item.values).filter(isFiniteNumber);
  const range =
    shared && valid.length
      ? { min: Math.min(...valid), max: Math.max(...valid) }
      : null;
  const gradientId = `g${chart.replace(/[^a-z0-9]/gi, "")}`;
  const first = series[0];
  const area = first ? areaPath(first.values, WIDTH, height, 6, range) : "";
  const noData = valid.length === 0;
  const points = Math.max(0, ...series.map((item) => item.values.length));
  const graph: GraphInput | null = noData
    ? null
    : {
        start: start ?? now.getTime() - DAY_MS,
        end: end ?? now.getTime(),
        unit: unit ?? "W",
        decimals: decimals ?? 0,
        series: series.map((item) => ({
          label: item.label,
          color: item.color,
          values: item.values,
          unit: item.unit,
          decimals: item.decimals,
        })),
      };

  // The card and the sheet can hand the same chart new history without a
  // remount; refreshing the dataset on every commit keeps the hover readout
  // in sync while leaving React's svg paths untouched.
  useEffect(() => {
    const element = hostRef.current;
    if (element) applyGraph(element, graph);
  });

  return (
    <div
      ref={hostRef}
      className={`chart-box${noData ? " no-data" : ""}`}
      data-chart={chart}
      data-points={points}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        data-chart-shared={shared ? "1" : "0"}
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
            y1={(height * part).toFixed(1)}
            x2={WIDTH}
            y2={(height * part).toFixed(1)}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {first && area ? (
          <path
            data-chart-area={first.key}
            fill={`url(#${escapeHtml(gradientId)})`}
            d={area}
          />
        ) : null}
        {series.map((item) => (
          <path
            key={item.key}
            data-chart-line={item.key}
            fill="none"
            stroke={item.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            d={sparkPath(item.values, WIDTH, height, 6, range)}
          />
        ))}
      </svg>
      <span className="chart-empty">{empty}</span>
    </div>
  );
}
