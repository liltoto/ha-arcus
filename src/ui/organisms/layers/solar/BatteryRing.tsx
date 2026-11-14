import { GaugeArc } from "../../../atoms/GaugeArc";
import type { Language } from "../../../../types";
import { fmt } from "./helpers";

export interface BatteryRingProps {
  value: number | null;
  label: string;
  note: string;
  language: Language;
}

/**
 * The battery state-of-charge ring. `GaugeArc` draws the track and the
 * progress arc; the big readout stays inside the same block the legacy sheet
 * used, so the battery tab keeps its hierarchy.
 */
export function BatteryRing({
  value,
  label,
  note,
  language,
}: BatteryRingProps) {
  return (
    <div className="block" data-battery-ring>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 104,
            height: 104,
            flex: "0 0 auto",
          }}
        >
          <GaugeArc value={value ?? 0} max={100} size={104} stroke={4} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="big-read" style={{ fontSize: 38 }}>
              {fmt(value, 0, language)}
              <small>%</small>
            </span>
          </div>
        </div>
        <div>
          <div className="block-label">{label}</div>
          <div className="block-note" style={{ marginTop: 6 }}>
            {note}
          </div>
        </div>
      </div>
    </div>
  );
}
