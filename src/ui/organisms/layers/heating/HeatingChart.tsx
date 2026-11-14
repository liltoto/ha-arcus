import { useId } from "react";
import type { TemperatureUnit } from "../../../../types";
import { ChartBox } from "../../../molecules/ChartBox";
import { c } from "../../../styles/classes";
import { CHART_HEIGHT } from "./helpers";

function encodeValues(values: Array<number | null>): string {
  return values
    .map((value) =>
      value === null || !Number.isFinite(value)
        ? ""
        : String(Math.round(value * 10000) / 10000),
    )
    .join(";");
}

export interface HeatingChartProps {
  label: string;
  title: string;
  values: Array<number | null>;
  hasData: boolean;
  line: string;
  area: string;
  unit: TemperatureUnit;
  start: number;
  end: number;
  emptyLabel: string;
}

/** The 24-hour temperature chart, keeping the legacy graph attributes. */
export function HeatingChart({
  label,
  title,
  values,
  hasData,
  line,
  area,
  unit,
  start,
  end,
  emptyLabel,
}: HeatingChartProps) {
  const gradientId = `heat-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{label}</div>
      <ChartBox title={title} noData={!hasData} emptyLabel={emptyLabel}>
        <svg
          viewBox={`0 0 560 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          data-graph="line"
          data-gv={hasData ? encodeValues(values) : undefined}
          data-gu={unit}
          data-gd="1"
          data-gt0={String(start)}
          data-gt1={String(end)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--amber)" stopOpacity=".26" />
              <stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((part) => (
            <line
              key={part}
              x1="0"
              y1={CHART_HEIGHT * part}
              x2="560"
              y2={CHART_HEIGHT * part}
              stroke="var(--line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path fill={`url(#${gradientId})`} d={area} />
          <path
            fill="none"
            stroke="var(--amber)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            d={line}
          />
        </svg>
      </ChartBox>
    </div>
  );
}
