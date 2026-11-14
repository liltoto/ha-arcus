/**
 * Placeholder for the indoor, price, battery, and solar vitals. Task 6b
 * replaces this with the real stat row.
 */
export interface VitalsProps {
  className?: string;
}

export function Vitals({ className }: VitalsProps = {}) {
  return (
    <div className={className} data-placeholder="vitals">
      Vitals
    </div>
  );
}
