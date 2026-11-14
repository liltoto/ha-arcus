/**
 * Placeholder for the greeting, day-arc, and weather hero. Task 6b replaces
 * this with the real hero content.
 */
export interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps = {}) {
  return (
    <div className={className} data-placeholder="hero">
      Hero
    </div>
  );
}
