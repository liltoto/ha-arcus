import type { ReactNode } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { HistoryCache } from "../data/history";
import type {
  ActionConfig,
  ArcusConfig,
  ArcusHass,
  AtmosphereSetting,
  HomeModel,
  Translator,
} from "../types";

/**
 * The imperative surface the card exposes to the React tree.
 *
 * Components never talk to `hass` directly; the card owns service calls,
 * routing, toasts, and atmosphere persistence.
 */
export interface ArcusActions {
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): void;
  navigate(path: string): void;
  openSheet(route: string): void;
  closeSheet(): void;
  performAction(action: ActionConfig): void;
  toast(text: string): void;
  setAtmo(mode: AtmosphereSetting): void;
}

/**
 * The card's route. It includes the home route (`hjem`); sheet pages receive
 * the same shape and read `base`/`sub`.
 */
export interface ArcusRoute {
  base: string;
  sub: string | null;
}

/**
 * Everything the React tree can read. The card owns one store per instance
 * and replaces the snapshot when Home Assistant pushes state; components
 * subscribe to individual slices through `src/ui/hooks.ts`.
 */
export interface ArcusStoreState {
  hass: ArcusHass;
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  bindings: Record<string, string>;
  route: ArcusRoute;
  actions: ArcusActions;
  history: HistoryCache;
  now: () => Date;
  atmo: AtmosphereSetting;
  dark: boolean;
}

export type ArcusStore = StoreApi<ArcusStoreState>;

export interface ArcusProviderProps {
  store: ArcusStore;
  children: ReactNode;
}
