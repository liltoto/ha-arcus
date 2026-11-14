import type { ComponentType } from "react";
import type { LayerBodyProps } from "../../src/ui/pages/layerRegistry";
import type { ArcusRoute } from "../../src/ui/types";
import {
  renderWithArcus,
  type ArcusRenderOptions,
} from "./home-test-utils";

/**
 * Render one layer body with the fixture provider and the route the body
 * expects.
 */
export function renderLayer(
  Body: ComponentType<LayerBodyProps>,
  options: ArcusRenderOptions & { route?: ArcusRoute } = {},
) {
  const route = options.route ?? { base: "energi", sub: null };
  const result = renderWithArcus(<Body route={route} />, {
    ...options,
    route,
  });
  return { ...result, route };
}
