import type { CSSProperties, ReactNode } from "react";
import type { ChartValues } from "../../render/charts";
import type { GraphInput } from "../../render/graph";
import { Sparkline } from "../atoms/Sparkline";
import { VitalText } from "../atoms/VitalText";
import { c } from "../styles/classes";

export interface VitalStatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  spark?: ChartValues;
  sparkGraph?: GraphInput | null;
  sparkRange?: { min: number; max: number } | null;
  ring?: ReactNode;
  onClick?: () => void;
  sparkColor?: string;
}

/**
 * A hero statistic. The ring slot is for battery-style gauges; the sparkline
 * is drawn from the history cache by the page and only displayed here.
 */
export function VitalStat({
  label,
  value,
  unit,
  sub,
  spark,
  sparkGraph = null,
  sparkRange = null,
  ring,
  onClick,
  sparkColor = "var(--sky)",
}: VitalStatProps) {
  const body = (
    <>
      <VitalText label={label} value={value} unit={unit} sub={sub} />
      {spark ? (
        <Sparkline
          className={c("vital-spark")}
          values={spark}
          pad={1}
          range={sparkRange}
          strokeWidth={1}
          graph={sparkGraph}
          style={{ color: sparkColor } as CSSProperties}
        />
      ) : null}
      {ring ? <div className={c("vital-ring")}>{ring}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={c("vital")} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className={c("vital")}>{body}</div>;
}
