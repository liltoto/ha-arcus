import type { ReactNode, RefObject } from "react";
import { SheetGrab } from "../atoms/SheetGrab";
import { c } from "../styles/classes";

export interface SheetTemplateProps {
  open: boolean;
  label: string;
  sheetRef: RefObject<HTMLElement | null>;
  onScrimClick: () => void;
  children: ReactNode;
}

/**
 * The static sheet shell: scrim, grab handle, and the dialog frame. Behavior
 * (focus, escape, drag, scroll reset) lives in `SheetFrame`.
 */
export function SheetTemplate({
  open,
  label,
  sheetRef,
  onScrimClick,
  children,
}: SheetTemplateProps) {
  return (
    <>
      <div
        className={c("scrim", open && "open")}
        data-scrim
        onClick={(event) => {
          // Keep the click inside React; the card no longer delegates it.
          event.stopPropagation();
          onScrimClick();
        }}
      />
      <section
        ref={sheetRef}
        className={c("sheet", open && "open")}
        data-sheet
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <SheetGrab />
        {children}
      </section>
    </>
  );
}
