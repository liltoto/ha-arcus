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
}

export function Sparkline({
  values,
  width = 100,
  height = 28,
  pad = 2,
  range = null,
  area = false,
  className,
}: SparklineProps) {
  const d = area
    ? areaPath(values, width, height, pad, range)
    : sparkPath(values, width, height, pad, range);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d={d}
        fill={area ? "currentColor" : "none"}
        fillOpacity={area ? 0.12 : undefined}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}
