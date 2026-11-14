/**
 * Placeholder for the discovered room grid. Task 6b replaces this with the
 * real `RoomCard` grid.
 */
export interface RoomGridProps {
  className?: string;
}

export function RoomGrid({ className }: RoomGridProps = {}) {
  return (
    <div className={className} data-placeholder="room-grid">
      RoomGrid
    </div>
  );
}
