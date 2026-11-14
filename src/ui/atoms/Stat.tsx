import type { ReactNode } from "react";
import { c } from "../styles/classes";

export interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
  tone?: "default" | "ok" | "warn";
}

export function Stat({ label, value, unit, sub, tone = "default" }: StatProps) {
  return (
    <div className={c("vital", tone === "default" ? "" : tone)}>
      <div className={c("vital-label")}>{label}</div>
      <div className={c("vital-value")}>
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      {sub ? <div className={c("vital-sub")}>{sub}</div> : null}
    </div>
  );
}
