import type { SheetRoute } from "../../../types";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { LegacySheet } from "../../providers/LegacySheet";

/**
 * Ventilation layer stub. The layer agent replaces this body with the React port;
 * until then the legacy string renderer keeps the sheet working.
 */
export function VentilationBody({ app, route }: LayerBodyProps) {
  return <LegacySheet app={app} route={route as SheetRoute} />;
}
