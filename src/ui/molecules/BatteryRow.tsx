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
    <div className="row">
      <span className="row-main">
        <div className="row-name">{name}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
      </span>
      <div className="bar" data-batt={entity}>
        <i className={tone} style={{ width: `${level}%` }} />
      </div>
      <span className="row-val">
        {level}
        <small>%</small>
      </span>
    </div>
  );
}
