import { useEffect, useRef } from "react";
import type { HistoryCache } from "../../../../data/history";
import { type ResolvedHistoryRange } from "../../../../range";
import { areaPath, sparkPath } from "../../../../render/charts";
import { applyGraph, type GraphInput } from "../../../../render/graph";
import {
  chartStateFor,
  rangeStatusFor,
  windowSeries,
} from "../../../hooks/useHistoryRange";
import { chartStateLabel } from "../../../molecules/ChartBox";
import { c } from "../../../styles/classes";

export interface RoomChartProps {
  history: HistoryCache;
  entityId: string | null | undefined;
  color: string;
  range: ResolvedHistoryRange;
  height?: number;
  unit?: string;
  decimals?: number;
  emptyLabel: string;
  loadingLabel: string;
  unavailableLabel: string;
  unavailable?: boolean;
  now: () => Date;
}

interface RoomChartSvgProps {
  height: number;
  gradientId: string;
  color: string;
  line: string;
  area: string;
}

const GRID = [0.25, 0.5, 0.75];
const BUCKETS = 96;

/** The chart lines and grid; the frame owns the state overlay. */
const RoomChartSvg = ({
  height,
  gradientId,
  color,
  line,
  area,
}: RoomChartSvgProps) => {
  return (
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
      {GRID.map((part) => (
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
  );
};

const roomPaths = (
  values: Array<number | null>,
  hasData: boolean,
  height: number,
): { line: string; area: string } => {
  if (!hasData) return { line: "", area: "" };
  return {
    line: sparkPath(values, 560, height, 2),
    area: areaPath(values, 560, height, 2),
  };
};

const roomGraph = (
  values: Array<number | null>,
  hasData: boolean,
  range: ResolvedHistoryRange,
  unit: string,
  decimals: number,
): GraphInput | null => {
  if (!hasData) return null;
  return {
    start: range.start,
    end: range.end,
    unit,
    decimals,
    series: [{ values }],
  };
};

const ChartStateOverlay = ({ label }: { label: string | null }) => {
  if (!label) return null;
  return <span className={c("chart-empty")}>{label}</span>;
};

/**
 * One room chart for the selected history window. The legacy renderer wrote
 * the graph hover metadata straight onto `.chart-box`; keep the same
 * attributes so the card's `mountGraphTips` can still read them after a React
 * render.
 */
export const RoomChart = ({
  history,
  entityId,
  color,
  range,
  height = 120,
  unit = "",
  decimals = 1,
  emptyLabel,
  loadingLabel,
  unavailableLabel,
  unavailable = false,
  now,
}: RoomChartProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const values = windowSeries(history, entityId, range, now(), BUCKETS, "hold");
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const state = chartStateFor(
    hasData,
    rangeStatusFor(history, entityId, range),
    unavailable,
  );
  const label = chartStateLabel(state, {
    empty: emptyLabel,
    loading: loadingLabel,
    unavailable: unavailableLabel,
  });
  const gradientId = `g${String(entityId ?? "chart").replace(
    /[^a-z0-9]/gi,
    "",
  )}-${height}`;
  const { line, area } = roomPaths(values, hasData, height);
  const graph = roomGraph(values, hasData, range, unit, decimals);

  useEffect(() => {
    if (boxRef.current) applyGraph(boxRef.current, graph);
  });

  return (
    <div
      ref={boxRef}
      className={c("chart-box")}
      data-state={state}
      aria-busy={state === "loading" || undefined}
    >
      <RoomChartSvg
        height={height}
        gradientId={gradientId}
        color={color}
        line={line}
        area={area}
      />
      <ChartStateOverlay label={label} />
    </div>
  );
};
