import { c } from "../styles/classes";
export interface PrayerMarkerProps {
  name: string;
  time: string;
  next?: boolean;
  nextLabel?: string;
}

/** One prayer time; the next prayer is highlighted and machine-readable. */
export function PrayerMarker({
  name,
  time,
  next = false,
  nextLabel = "Next",
}: PrayerMarkerProps) {
  return (
    <div
      className={c("row", next && "on next")}
      data-next={next ? "true" : "false"}
    >
      <span className={c("row-main")}>
        <span className={c("row-name")}>{name}</span>
      </span>
      <span className={c("row-val")}>{time}</span>
      {next ? <span className={c("chip warn")}>{nextLabel}</span> : null}
    </div>
  );
}
