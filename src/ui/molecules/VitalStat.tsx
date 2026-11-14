import type { CSSProperties, ReactNode } from "react";
import { Sparkline } from "../atoms/Sparkline";

export interface VitalStatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  spark?: number[];
  /** Legacy `data-spark` key for the card's history patcher. */
  sparkKey?: string;
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
  sparkKey,
  sparkRange = null,
  ring,
  onClick,
  sparkColor = "var(--sky)",
}: VitalStatProps) {
  const body = (
    <>
      <div className="vital-label">{label}</div>
      <div className="vital-value">
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      {sub ? <div className="vital-sub">{sub}</div> : null}
      {sparkKey ? (
        <svg
          className="vital-spark"
          viewBox="0 0 100 28"
          preserveAspectRatio="none"
          style={{ color: sparkColor } as CSSProperties}
        >
          <path
            data-spark={sparkKey}
            d=""
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : spark?.length ? (
        <Sparkline
          className="vital-spark"
          values={spark}
          range={sparkRange}
          style={{ color: sparkColor } as CSSProperties}
        />
      ) : null}
      {ring ? <div className="vital-ring">{ring}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="vital" onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className="vital">{body}</div>;
}
