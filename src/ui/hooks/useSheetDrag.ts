import { useEffect, useRef, type RefObject } from "react";

/**
 * Drag the mobile sheet down by its grab handle. The sheet follows the
 * pointer and dismisses after a 100 px pull; a shorter pull snaps back.
 *
 * The close callback is kept in a ref so a Home Assistant state push does not
 * tear down an in-flight drag listener.
 */
export function useSheetDrag(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const sheet = ref.current;
    if (!sheet) return;

    let stopDrag: (() => void) | null = null;

    const start = (event: PointerEvent): void => {
      const target = event.target as Element | null;
      if (!target?.closest?.("[data-sheet-grab]")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(min-width: 900px)")?.matches
      ) {
        return;
      }

      stopDrag?.();

      const startY = event.clientY;
      let dy = 0;

      const reset = (): void => {
        sheet.style.transition = "";
        sheet.style.transform = "";
      };

      const finish = (commit: boolean): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        reset();
        stopDrag = null;
        if (commit && dy > 100) closeRef.current();
      };

      const move = (moveEvent: PointerEvent): void => {
        dy = Math.max(0, moveEvent.clientY - startY);
        sheet.style.transform = `translateY(${dy}px)`;
      };

      const up = (): void => finish(true);

      sheet.style.transition = "none";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      stopDrag = () => finish(false);
    };

    sheet.addEventListener("pointerdown", start);
    return () => {
      sheet.removeEventListener("pointerdown", start);
      stopDrag?.();
    };
  }, [ref]);
}
