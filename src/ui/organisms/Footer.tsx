/**
 * Placeholder for the footer mark and version line. Task 6b replaces this
 * with the real footer content.
 */
export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps = {}) {
  return (
    <div className={className} data-placeholder="footer">
      Footer
    </div>
  );
}
