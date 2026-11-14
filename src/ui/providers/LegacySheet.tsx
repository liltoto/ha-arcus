import { createElement, useLayoutEffect, useRef } from "react";
import type {
  ArcusSheetsElement,
  SheetApp,
  SheetRoute,
} from "../../views/layers/types";

export interface LegacySheetProps {
  app: SheetApp;
  route: SheetRoute;
}

/**
 * Bridges an unported layer into the React sheet.
 *
 * The legacy element owns its `innerHTML`; React must render it with no
 * children so a re-render cannot wipe the layer markup. Properties are
 * re-applied after a late custom-element upgrade because properties set
 * before `customElements.define()` become own data properties that would
 * otherwise shadow the element's setters.
 */
export function LegacySheet({ app, route }: LegacySheetProps) {
  const ref = useRef<ArcusSheetsElement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const apply = (): void => {
      const own = element as unknown as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(element, "app")) {
        delete own.app;
      }
      if (Object.prototype.hasOwnProperty.call(element, "route")) {
        delete own.route;
      }
      element.app = app;
      element.route = route;
      element.update?.();
    };

    apply();

    let cancelled = false;
    if (
      typeof customElements !== "undefined" &&
      !customElements.get("arcus-sheets") &&
      typeof customElements.whenDefined === "function"
    ) {
      void customElements
        .whenDefined("arcus-sheets")
        .then(() => {
          if (!cancelled) apply();
        })
        .catch(() => {
          /* The bridge is optional until the sheets module is loaded. */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [app, route]);

  return createElement("arcus-sheets", { ref });
}
