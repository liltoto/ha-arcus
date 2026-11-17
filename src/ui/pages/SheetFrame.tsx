import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useSheetDrag } from "../hooks/useSheetDrag";
import { SheetPage } from "./SheetPage";
import { useActions, useRoute, useTranslator } from "../hooks";
import { HistoryRange } from "../organisms/HistoryRange";
import { SheetTemplate } from "../templates/SheetTemplate";
import type { ArcusRoute } from "../types";

const EXIT_MS = 450;

/** Sheets whose charts can follow the card-wide history window. */
const HISTORY_ROUTES = new Set([
  "rum",
  "skur",
  "sol",
  "vand",
  "varme",
  "energi",
  "teknik",
  "oekonomi",
]);

const showsRange = (route: ArcusRoute): boolean => {
  if (!HISTORY_ROUTES.has(route.base)) return false;
  // The forecast tab predicts forward; it has no historical series to rewind.
  return !(route.base === "sol" && route.sub === "prognose");
};

/**
 * Keeps the last non-home route mounted for the CSS slide-out. The sheet stays
 * in the tree permanently so opening and closing are pure class changes.
 */
const useRetainedRoute = (route: ArcusRoute): ArcusRoute | null => {
  const [retained, setRetained] = useState<ArcusRoute | null>(() =>
    route.base === "hjem" ? null : route,
  );

  useEffect(() => {
    if (route.base !== "hjem") {
      // oxlint-disable-next-line react/set-state-in-effect -- retain the last sheet route for the exit animation.
      setRetained(route);
      return;
    }
    if (!retained) return;
    const timer = setTimeout(() => setRetained(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [route, retained]);

  return route.base === "hjem" ? retained : route;
};

/**
 * Owns the sheet frame behavior: open state, focus trap, Escape, scrim,
 * drag-to-dismiss, and scroll reset. The body comes from `SheetPage`.
 */
export const SheetFrame = () => {
  const route = useRoute();
  const actions = useActions();
  const t = useTranslator();
  const sheetRef = useRef<HTMLElement>(null);
  const bodyRoute = useRetainedRoute(route);
  const open = route.base !== "hjem";

  const close = useCallback(() => {
    actions.closeSheet();
  }, [actions]);

  useFocusTrap(sheetRef, open);
  useSheetDrag(sheetRef, close);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  const routeKey = bodyRoute ? `${bodyRoute.base}/${bodyRoute.sub ?? ""}` : "";

  useEffect(() => {
    if (!open || !bodyRoute) return;
    const scroll =
      sheetRef.current?.querySelector<HTMLElement>(".sheet-scroll");
    if (!scroll) return;
    scroll.scrollTop = 0;
    try {
      scroll.scrollTo(0, 0);
    } catch {
      /* happy-dom and some embedded browsers do not implement scrollTo. */
    }
  }, [bodyRoute, open, routeKey]);

  return (
    <SheetTemplate
      open={open}
      label={t("sheet.details")}
      sheetRef={sheetRef}
      onScrimClick={close}
    >
      {bodyRoute && showsRange(bodyRoute) ? (
        <HistoryRange variant="sheet" />
      ) : null}
      {bodyRoute ? <SheetPage route={bodyRoute} /> : null}
    </SheetTemplate>
  );
};
