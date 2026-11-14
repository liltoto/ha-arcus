import type { ReactNode } from "react";
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
 * routing, confirmations, toasts, and atmosphere persistence.
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
  confirm(text: string, act: string): void;
  toast(text: string): void;
  setAtmo(mode: AtmosphereSetting): void;
}

/**
 * Everything a page needs for one render. The card passes these values
 * straight through; the provider never copies or memoizes them.
 */
/**
 * The card's route. It includes the home route (`hjem`), which is not a
 * `SheetRoute`; sheet pages narrow this once they are rendered.
 */
export interface ArcusRoute {
  base: string;
  sub: string | null;
}

export interface ArcusProviderProps {
  hass: ArcusHass;
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  bindings: Record<string, string>;
  route: ArcusRoute;
  actions: ArcusActions;
  history: HistoryCache;
  now: () => Date;
  children: ReactNode;
}
