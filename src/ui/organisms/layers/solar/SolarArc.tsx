import { useEffect, useRef } from "react";
import { arcPoint } from "../../../../render/charts";
import { applyGraph } from "../../../../render/graph";
import type { SolarPoint } from "../../../../types";
import { DAY_MS, dayFraction, isFiniteNumber, pointDate } from "./helpers";
import { c } from "../../../styles/classes";

export interface SolarArcProps {
  points: SolarPoint[];
  now: Date;
  empty: string;
}

const WIDTH = 1000;
const HEIGHT = 300;
const BASE = 210;
const RISE = 72;

/**
 * Today's production forecast drawn on the same parabola as the home day
 * arc. It gives the forecast tab a solar-shaped chart instead of another
 * rectangular line plot.
 */
export function SolarArc({ points, now, empty }: SolarArcProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = dayStart.getTime() + DAY_MS;
  const values = points.map((point) => point.v).filter(isFiniteNumber);
  const max = Math.max(3000, ...values, 1);
  const coords = points.flatMap((point) => {
    const date = pointDate(point);
    if (!date) return [];
    const position = arcPoint(dayFraction(date));
    return [
      {
        x: position.x,
        y: position.y - (point.v / max) * RISE,
        t: date.getTime(),
        v: point.v,
      },
    ];
  });
  const line = coords.length
    ? `M${coords.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join("L")}`
    : "";
  const area = line
    ? `M40,${BASE}L${coords
        .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
        .join("L")}L960,${BASE}Z`
    : "";
  const nowPoint = arcPoint(dayFraction(now));
  const noData = coords.length === 0;

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    if (noData) {
      applyGraph(element, null);
      return;
    }
    applyGraph(element, {
      mode: "timed",
      start: dayStart.getTime(),
      end: dayEnd,
      unit: "W",
      decimals: 0,
      points: coords.map((point) => ({ t: point.t, v: point.v })),
    });
  });

  return (
    <div data-solar-arc>
      <div
        ref={hostRef}
        className={c("chart-box", noData && "no-data")}
        data-chart="solar-arc"
        data-points={coords.length}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="solarArcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--amber)" stopOpacity=".34" />
              <stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M40,${BASE} Q500,-90 960,${BASE}`}
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {area ? (
            <path d={area} fill="url(#solarArcFill)" stroke="none" />
          ) : null}
          {line ? (
            <path
              d={line}
              fill="none"
              stroke="var(--amber)"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              opacity=".9"
            />
          ) : null}
          <circle cx={nowPoint.x} cy={nowPoint.y} r="4" fill="var(--amber)" />
        </svg>
        <span className={c("chart-empty")}>{empty}</span>
      </div>
    </div>
  );
}
