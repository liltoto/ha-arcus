/**
 * Placeholder for the configured and default quick actions. Task 6b replaces
 * this with the real quick-action row.
 */
export interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps = {}) {
  return (
    <div className={className} data-placeholder="quick-actions">
      QuickActions
    </div>
  );
}
