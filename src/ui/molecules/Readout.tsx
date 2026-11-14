import type { ReactNode } from "react";

export interface ReadoutProps {
  label: string;
  value: ReactNode;
  unit?: string;
}

/** One cell of a `.readings` grid. */
export function Readout({ label, value, unit }: ReadoutProps) {
  return (
    <div className="reading">
      <div className="v">
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}
