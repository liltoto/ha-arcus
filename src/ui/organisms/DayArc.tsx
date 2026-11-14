import type { AtmosphereSetting } from "../../types";

export interface DayArcProps {
  atmo: AtmosphereSetting;
}

/**
 * Placeholder for the day arc. The home-arc agent owns this file and replaces
 * it with the real prayer/sun/price arc; keeping the file here lets the hero
 * agent compose it without blocking on the arc implementation.
 */
export function DayArc(_props: DayArcProps) {
  return <div className="arc-wrap" data-placeholder="day-arc" />;
}
