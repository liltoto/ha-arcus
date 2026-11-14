import type { ReactNode } from "react";

export interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
  tone?: "default" | "ok" | "warn";
}

export function Stat({ label, value, unit, sub, tone = "default" }: StatProps) {
  const classes = ["vital", tone === "default" ? "" : tone]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="vital-label">{label}</div>
      <div className="vital-value">
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      {sub ? <div className="vital-sub">{sub}</div> : null}
    </div>
  );
}
