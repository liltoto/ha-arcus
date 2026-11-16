import { useId } from "react";
import { areaPath, sparkPath } from "../../../../render/charts";
import { graphAttrs, type GraphInput } from "../../../../render/graph";
import type { Translator } from "../../../../types";
import { ChartBox } from "../../../molecules/ChartBox";
import { c } from "../../../styles/classes";

const CHART_HEIGHT = 110;
const CHART_WIDTH = 560;
const DAY_MS = 86_400_000;

/**
 * `graphAttrs` produces an HTML attribute string for the legacy string views.
 * React needs the same values as props, so decode the escaped entities that
 * `graphAttrs` adds when it serialises the series JSON.
 */
const graphProps = (input: GraphInput): Record<string, string> => {
  const props: Record<string, string> = {};
  for (const match of graphAttrs(input).matchAll(
    /data-([a-z0-9]+)="([^"]*)"/g,
  )) {
    props[`data-${match[1]}`] = match[2]
      .replaceAll("&quot;", '"')
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
  }
  return props;
};

interface WaterFlowProps {
  values: Array<number | null>;
  end: number;
  t: Translator;
}

/** The 24-hour flow chart, with the exact legacy graph bindings. */
export const WaterFlow = ({ values, end, t }: WaterFlowProps) => {
  const gradientId = `water-chart-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const area = areaPath(values, CHART_WIDTH, CHART_HEIGHT, 2);
  const line = sparkPath(values, CHART_WIDTH, CHART_HEIGHT, 2);
  const graph = hasData
    ? graphProps({
        start: end - DAY_MS,
        end,
        unit: "L/min",
        decimals: 1,
        series: [{ values, color: "var(--sky)" }],
      })
    : {};

  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("water.flow24")}</div>
      <ChartBox
        state={hasData ? "ready" : "empty"}
        emptyLabel={t("empty.chart")}
      >
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          {...graph}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--sky)" stopOpacity=".26" />
              <stop offset="1" stopColor="var(--sky)" stopOpacity="0" />
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
          <path
            fill="none"
            stroke="var(--sky)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            d={line}
          />
        </svg>
      </ChartBox>
    </div>
  );
};
