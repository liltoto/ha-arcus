import type { ArcusRoute } from "../types";
import { layerRegistry } from "./layerRegistry";

export interface SheetPageProps {
  route: ArcusRoute;
}

/** Resolves the active layer body from the route. */
export function SheetPage({ route }: SheetPageProps) {
  if (route.base === "hjem") return null;
  const Body = layerRegistry[route.base];
  return Body ? <Body route={route} /> : null;
}
