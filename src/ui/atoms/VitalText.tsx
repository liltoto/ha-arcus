import type { ReactNode } from "react";
import { c } from "../styles/classes";

export interface VitalTextProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
}

/**
 * The label/value/sub text stack shared by `Stat` and `VitalStat`. It is a
 * fragment because each caller owns the surrounding `.vital` element.
 */
export function VitalText({ label, value, unit, sub }: VitalTextProps) {
  return (
    <>
      <div className={c("vital-label")}>{label}</div>
      <div className={c("vital-value")}>
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      {sub ? <div className={c("vital-sub")}>{sub}</div> : null}
    </>
  );
}
