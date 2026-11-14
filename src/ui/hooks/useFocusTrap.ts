import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * The focusable controls that are actually reachable. `offsetParent` is not
 * reliable in happy-dom and shadow DOM, so hidden `<details>` content and
 * explicit `hidden`/`aria-hidden` regions are filtered by ancestry instead.
 */
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      !element.closest("[hidden]") &&
      element.closest("[aria-hidden='true']") === null &&
      !element.closest("details:not([open])"),
  );
}

function focusElement(
  element: HTMLElement | null | undefined,
  options?: FocusOptions,
): void {
  try {
    element?.focus(options);
  } catch {
    /* happy-dom and older Safari can reject the options object. */
  }
}

/** The active element inside the sheet's document or shadow root. */
function activeElement(root: HTMLElement): HTMLElement | null {
  const scope = root.getRootNode?.() as Document | ShadowRoot | undefined;
  if (scope && "activeElement" in scope) {
    return (scope.activeElement as HTMLElement | null) ?? null;
  }
  return typeof document !== "undefined"
    ? (document.activeElement as HTMLElement | null)
    : null;
}

/**
 * Traps focus inside the open sheet and restores the previous focus on close.
 *
 * The close button is focused on the next frame so the slide-in animation has
 * started before focus jumps into the dialog. Reduced-motion users get the
 * focus immediately because there is no animation to wait for.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const sheet = ref.current;
    if (!sheet) return;

    const previous =
      typeof document !== "undefined" ? activeElement(sheet) : null;
    const reduce =
      typeof window !== "undefined"
        ? (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
          false)
        : false;

    const focusClose = (): void => {
      if (!sheet.isConnected) return;
      const close = sheet.querySelector<HTMLElement>(
        '[data-act="close"], .sheet-close',
      );
      focusElement(close ?? focusables(sheet)[0], { preventScroll: true });
    };

    let frame: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (reduce) {
      focusClose();
    } else if (typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(focusClose);
    } else {
      timer = setTimeout(focusClose, 0);
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      const items = focusables(sheet);
      if (!items.length) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = activeElement(sheet);

      if (!current || !sheet.contains(current)) {
        event.preventDefault();
        focusElement(event.shiftKey ? last : first);
        return;
      }
      if (event.shiftKey && current === first) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
      focusElement(previous, { preventScroll: true });
    };
  }, [active, ref]);
}
