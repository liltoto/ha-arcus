import { c } from "../styles/classes";
export interface BatteryRowProps {
  name: string;
  value: number;
  sub?: string;
  entity?: string;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * A battery level row. The tone thresholds mirror the security sheet: under
 * 20 % is critical, under 40 % is a warning, everything else is sage.
 */
export function BatteryRow({ name, value, sub, entity }: BatteryRowProps) {
  const level = clampPercent(value);
  const tone = level < 20 ? "warn" : level < 40 ? "mid" : "";

  return (
    <div className={c("row")}>
      <span className={c("row-main")}>
        <div className={c("row-name")}>{name}</div>
        {sub ? <div className={c("row-sub")}>{sub}</div> : null}
      </span>
      <div className={c("bar")} data-batt={entity}>
        <i className={c(tone)} style={{ width: `${level}%` }} />
      </div>
      <span className={c("row-val")}>
        {level}
        <small>%</small>
      </span>
    </div>
  );
}
