import type { ReactNode } from "react";
import { c } from "../styles/classes";
import { VitalText } from "./VitalText";

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
      <VitalText label={label} value={value} unit={unit} sub={sub} />
    </div>
  );
}
