/**
 * Placeholder for the home top bar. Task 6b replaces this with the real brand,
 * date, presence, alert, and atmosphere controls.
 */
export interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps = {}) {
  return (
    <div className={className} data-placeholder="topbar">
      TopBar
    </div>
  );
}
