import type { ReactNode } from "react";
import type { ChapterKey } from "../types";

/**
 * Presentation-only shapes consumed by the molecule layer. Pages build these
 * from the HomeModel and the live hass state; molecules never read either.
 */
export interface RoomView {
  id: string;
  name: string;
  kind: string;
  icon: string;
  tint: string;
  wide?: boolean;
  temp: number | null;
  air: "ok" | "mid" | "warn" | "off";
  airLabel: string;
  lightsOn: number;
  lightsTotal: number;
  lightsLabel?: string;
  open: number;
  openLabel: string;
  spark: number[];
}

export interface ChapterView {
  key: ChapterKey;
  title: string;
  icon: string;
  sum: string;
  large?: boolean;
  art?: ReactNode;
  meta?: string;
  num?: string;
}

export interface TabItem {
  key: string;
  label: string;
  route?: string;
}
