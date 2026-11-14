export interface GaugeArcProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "sage" | "brass" | "coral";
}

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function GaugeArc({
  value,
  max = 100,
  size = 40,
  stroke = 2.5,
  tone = "sage",
}: GaugeArcProps) {
  const ceiling = Number.isFinite(max) && max > 0 ? max : 100;
  const ratio = Number.isFinite(value)
    ? Math.min(Math.max(value / ceiling, 0), 1)
    : 0;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle
        cx="20"
        cy="20"
        r={RADIUS}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      <circle
        cx="20"
        cy="20"
        r={RADIUS}
        fill="none"
        stroke={`var(--${tone})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}
