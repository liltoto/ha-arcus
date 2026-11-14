import type { ComponentType } from "react";
import type { ArcusRoute } from "../types";
import { AllBody } from "../organisms/layers/AllBody";
import { AlertsBody } from "../organisms/layers/AlertsBody";
import { EconomyBody } from "../organisms/layers/EconomyBody";
import { EnergyBody } from "../organisms/layers/EnergyBody";
import { HeatingBody } from "../organisms/layers/HeatingBody";
import { LightsBody } from "../organisms/layers/LightsBody";
import { PrayersBody } from "../organisms/layers/PrayersBody";
import { RoomBody } from "../organisms/layers/RoomBody";
import { SecurityBody } from "../organisms/layers/SecurityBody";
import { SolarBody } from "../organisms/layers/SolarBody";
import { TechBody } from "../organisms/layers/TechBody";
import { VentilationBody } from "../organisms/layers/VentilationBody";
import { WaterBody } from "../organisms/layers/WaterBody";

export interface LayerBodyProps {
  route: ArcusRoute;
}

/**
 * Layer key to body. Every sheet is a React body now; the registry is the
 * single place the route switch lives.
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
