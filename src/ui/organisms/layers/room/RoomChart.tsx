import { useEffect, useRef } from "react";
import type { HistoryCache } from "../../../../data/history";
import { areaPath, sparkPath } from "../../../../render/charts";
import { applyGraph, type GraphInput } from "../../../../render/graph";

export interface RoomChartProps {
  history: HistoryCache;
  entityId: string | null | undefined;
  color: string;
  height?: number;
  unit?: string;
  decimals?: number;
  emptyLabel: string;
  now: () => Date;
}

/**
 * One 24-hour room chart. The legacy renderer wrote the graph hover metadata
 * straight onto `.chart-box`; keep the same attributes so the card's
 * `mountGraphTips` can still read them after a React render.
 */
export function RoomChart({
  history,
  entityId,
  color,
  height = 120,
  unit = "",
  decimals = 1,
  emptyLabel,
  now,
}: RoomChartProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const values = entityId ? history.series(entityId) : [];
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const gradientId = `g${String(entityId ?? "chart").replace(
    /[^a-z0-9]/gi,
    "",
  )}-${height}`;
  const line = hasData ? sparkPath(values, 560, height, 2) : "";
  const area = hasData ? areaPath(values, 560, height, 2) : "";
  const grid = [0.25, 0.5, 0.75];
  const end = now().getTime();
  const graph: GraphInput | null = hasData
    ? {
        start: end - 86_400_000,
        end,
        unit,
        decimals,
        series: [{ values }],
      }
    : null;

  useEffect(() => {
    if (boxRef.current) applyGraph(boxRef.current, graph);
  });

  return (
    <div ref={boxRef} className={`chart-box${hasData ? "" : " no-data"}`}>
      <svg
        viewBox={`0 0 560 ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".26" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((part) => (
          <line
            key={part}
            x1="0"
            y1={height * part}
            x2="560"
            y2={height * part}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path fill={`url(#${gradientId})`} d={area} />
        <path
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          d={line}
        />
      </svg>
      <span className="chart-empty">{emptyLabel}</span>
    </div>
  );
}
