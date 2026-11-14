import { useEffect, useRef, type CSSProperties } from "react";
import { applyGraph, type GraphInput } from "../../render/graph";
import {
  areaPath,
  sparkPath,
  type ChartRange,
  type ChartValues,
} from "../../render/charts";

export interface SparklineProps {
  values: ChartValues;
  width?: number;
  height?: number;
  pad?: number;
  range?: ChartRange | null;
  area?: boolean;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  /** Hover-readout metadata; `applyGraph` writes the `data-g*` hooks. */
  graph?: GraphInput | null;
}

export function Sparkline({
  values,
  width = 100,
  height = 28,
  pad = 2,
  range = null,
  area = false,
  className,
  style,
  strokeWidth = 1.1,
  graph = null,
}: SparklineProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current) applyGraph(ref.current, graph);
  });

  const d = area
    ? areaPath(values, width, height, pad, range)
    : sparkPath(values, width, height, pad, range);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d={d}
        fill={area ? "currentColor" : "none"}
        fillOpacity={area ? 0.12 : undefined}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
