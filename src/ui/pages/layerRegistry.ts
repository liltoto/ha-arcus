import { createElement, type ComponentType } from "react";
import type { SheetRoute } from "../../types";
import type { SheetApp } from "../../views/layers/types";
import type { ArcusRoute } from "../types";
import { LegacySheet } from "../providers/LegacySheet";
import { LightsBody } from "../organisms/layers/LightsBody";

export interface LayerBodyProps {
  app: SheetApp;
  route: ArcusRoute;
}

/** Every unported layer keeps the legacy string renderer behind the bridge. */
export function LegacyBody({ app, route }: LayerBodyProps) {
  return createElement(LegacySheet, {
    app,
    route: route as SheetRoute,
  });
}

/**
 * Layer key to body. Only the lights sheet has a React body so far; the rest
 * render through `<arcus-sheets>` until their ports land.
 */
export const layerRegistry: Record<string, ComponentType<LayerBodyProps>> = {
  lys: LightsBody,
  rum: LegacyBody,
  varme: LegacyBody,
  ventilation: LegacyBody,
  energi: LegacyBody,
  sol: LegacyBody,
  vand: LegacyBody,
  sikkerhed: LegacyBody,
  teknik: LegacyBody,
  oekonomi: LegacyBody,
  bon: LegacyBody,
  alarmer: LegacyBody,
  alle: LegacyBody,
  skur: LegacyBody,
};
