import { c } from "../styles/classes";
export interface ZoneStripProps {
  values: number[];
  warns?: boolean[];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** The tiny bar strip used by the heating and ventilation chapter art. */
export function ZoneStrip({ values, warns }: ZoneStripProps) {
  return (
    <div className={c("zone-strip")}>
      {values.map((value, index) => (
        <i
          key={index}
          className={c(warns?.[index] && "warn")}
          style={{ height: `${clampPercent(value)}%` }}
        />
      ))}
    </div>
  );
}
