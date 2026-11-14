import { createElement, type ComponentType } from "react";
import type { SheetRoute } from "../../types";
import type { SheetApp } from "../../views/layers/types";
import type { ArcusRoute } from "../types";
import { LegacySheet } from "../providers/LegacySheet";
import { LightsBody } from "../organisms/layers/LightsBody";
import { RoomBody } from "../organisms/layers/RoomBody";
import { HeatingBody } from "../organisms/layers/HeatingBody";
import { EnergyBody } from "../organisms/layers/EnergyBody";
import { SolarBody } from "../organisms/layers/SolarBody";
import { WaterBody } from "../organisms/layers/WaterBody";
import { SecurityBody } from "../organisms/layers/SecurityBody";
import { VentilationBody } from "../organisms/layers/VentilationBody";
import { TechBody } from "../organisms/layers/TechBody";
import { EconomyBody } from "../organisms/layers/EconomyBody";
import { PrayersBody } from "../organisms/layers/PrayersBody";
import { AlertsBody } from "../organisms/layers/AlertsBody";
import { AllBody } from "../organisms/layers/AllBody";

export interface LayerBodyProps {
  app: SheetApp;
  route: ArcusRoute;
}

/** Fallback for a route that has no registered body. */
export function LegacyBody({ app, route }: LayerBodyProps) {
  return createElement(LegacySheet, {
    app,
    route: route as SheetRoute,
  });
}

/**
 * Layer key to body. Every key has a stub from the start so a layer agent can
 * replace its own file without editing this shared registry.
 */
export const layerRegistry: Record<string, ComponentType<LayerBodyProps>> = {
  lys: LightsBody,
  rum: RoomBody,
  skur: RoomBody,
  varme: HeatingBody,
  ventilation: VentilationBody,
  energi: EnergyBody,
  sol: SolarBody,
  vand: WaterBody,
  sikkerhed: SecurityBody,
  teknik: TechBody,
  oekonomi: EconomyBody,
  bon: PrayersBody,
  alarmer: AlertsBody,
  alle: AllBody,
};
