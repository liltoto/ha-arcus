import type { SheetApp } from "../../views/layers/types";
import type { ArcusRoute } from "../types";
import { LegacyBody, layerRegistry } from "./layerRegistry";

export interface SheetPageProps {
  app: SheetApp;
  route: ArcusRoute;
}

/**
 * Resolves the active layer body. The provider owns hass/model/config, so the
 * page only needs the imperative card surface and the route being rendered.
 */
export function SheetPage({ app, route }: SheetPageProps) {
  if (route.base === "hjem") return null;
  const Body = layerRegistry[route.base] ?? LegacyBody;
  return <Body app={app} route={route} />;
}
