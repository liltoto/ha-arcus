/**
 * Static skeleton for the prayer/sun/price day arc.
 *
 * The card's `_refreshArc()` still queries these `data-*` nodes after mount to
 * set the path `d` attributes, needle positions, price segments, prayer marks,
 * and labels. Keep every hook (and the empty `d`) until the cleanup task ports
 * that patching into React.
 */
export function DayArc() {
  return (
    <div className="arc-wrap" data-arc>
      <div className="arc-glow" data-arc-glow />
      <div className="orb" data-orb />
      <div className="arc-readout" data-arc-readout />
      <svg
        className="arc-svg"
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brass)" stopOpacity=".42" />
            <stop offset="1" stopColor="var(--brass)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="pastClip">
            <rect data-past-clip x="40" y="0" width="0" height="300" />
          </clipPath>
        </defs>
        <path
          data-arc-line
          d=""
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <path
          data-arc-past
          d=""
          fill="none"
          stroke="var(--text-2)"
          strokeWidth="1.2"
          opacity=".7"
          clipPath="url(#pastClip)"
        />
        <path data-solar-area d="" fill="url(#solarFill)" stroke="none" />
        <path
          data-solar-line
          d=""
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          opacity=".9"
        />
        <path
          data-solar-actual
          d=""
          fill="none"
          stroke="var(--text)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          opacity=".75"
        />
        <g data-prices />
        <g data-prayer-marks />
      </svg>
      <div className="now-needle" data-now-needle />
      <div className="now-bead" data-now-bead />
      <div className="arc-labels" data-arc-labels />
      <div className="arc-hours">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}
