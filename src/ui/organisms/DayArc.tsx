/**
 * Placeholder for the day arc. The home-arc agent owns this file and replaces
 * it with the real prayer/sun/price arc; keeping the file here lets the hero
 * agent compose it without blocking on the arc implementation.
 */
export function DayArc() {
  return <div className="arc-wrap" data-placeholder="day-arc" />;
}
