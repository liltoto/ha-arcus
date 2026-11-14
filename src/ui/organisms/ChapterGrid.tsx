/**
 * Placeholder for the chapter grid. Task 6b replaces this with the real
 * `ChapterCard` grid.
 */
export interface ChapterGridProps {
  className?: string;
}

export function ChapterGrid({ className }: ChapterGridProps = {}) {
  return (
    <div className={className} data-placeholder="chapter-grid">
      ChapterGrid
    </div>
  );
}
