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
      className={`row${next ? " on next" : ""}`}
      data-next={next ? "true" : "false"}
    >
      <span className="row-main">
        <span className="row-name">{name}</span>
      </span>
      <span className="row-val">{time}</span>
      {next ? <span className="chip warn">{nextLabel}</span> : null}
    </div>
  );
}
