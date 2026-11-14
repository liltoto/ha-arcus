import type { ComponentType } from "react";
import type { LayerBodyProps } from "../../src/ui/pages/layerRegistry";
import type { ArcusRoute } from "../../src/ui/types";
import type { SheetApp } from "../../src/views/layers/types";
import {
  makeArcusProps,
  renderWithArcus,
  type ArcusRenderOptions,
} from "./home-test-utils";

export function appStub(): SheetApp {
  const props = makeArcusProps();
  return {
    _model: props.model,
    _config: props.config,
    _t: props.t,
    _history: props.history,
    _call: () => undefined,
    _closeRoute: () => undefined,
    _sheetHeader: () => "",
    _sheetTabs: () => "",
    _confirm: null,
    _refreshConfirm: () => undefined,
  } as unknown as SheetApp;
}

/**
 * Render one layer body with the fixture provider, a stub card surface, and
 * the route the body expects.
 */
export function renderLayer(
  Body: ComponentType<LayerBodyProps>,
  options: ArcusRenderOptions & { route?: ArcusRoute } = {},
) {
  const route = options.route ?? { base: "energi", sub: null };
  const app = appStub();
  const result = renderWithArcus(<Body app={app} route={route} />, {
    ...options,
    route,
  });
  return { ...result, app, route };
}
