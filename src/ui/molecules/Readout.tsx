import type { ReactNode } from "react";
import { c } from "../styles/classes";

export interface ReadoutProps {
  label: string;
  value: ReactNode;
  unit?: string;
}

/** One cell of a `.readings` grid. */
export function Readout({ label, value, unit }: ReadoutProps) {
  return (
    <div className={c("reading")}>
      <div className={c("v")}>
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      <div className={c("l")}>{label}</div>
    </div>
  );
}
