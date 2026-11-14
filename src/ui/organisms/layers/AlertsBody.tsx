import type { SheetRoute } from "../../../types";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { LegacySheet } from "../../providers/LegacySheet";

/**
 * Alerts layer stub. The layer agent replaces this body with the React port;
 * until then the legacy string renderer keeps the sheet working.
 */
export function AlertsBody({ app, route }: LayerBodyProps) {
  return <LegacySheet app={app} route={route as SheetRoute} />;
}
