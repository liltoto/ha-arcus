import type { HistoryCache } from "../../data/history";
import type {
  ArcusConfig,
  HomeModel,
  SheetRoute,
  Translator,
} from "../../types";

/**
 * The card surface the sheet element talks to. The card owns the sheet frame
 * (scrim, grab handle, open/close animation) and the sheet element only renders
 * the layer body in the card's light DOM so the card CSS applies.
 */
export interface SheetApp {
  _model: HomeModel;
  _config: ArcusConfig;
  _t: Translator;
  _history: HistoryCache;

  _call(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): void;
  _closeRoute(): void;
  _sheetHeader(kicker: string, title: string, sum: string): string;
  _sheetTabs(
    tabs: Array<{ key: string; label: string; route: string }>,
    active: string,
  ): string;
  _confirm: { text: string; act: string } | null;
  _refreshConfirm(): void;
}

export interface LayerContext {
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  history: HistoryCache;
  app: SheetApp;
}

export type LayerRenderer = (
  ctx: LayerContext,
  sub?: string | null,
) => string;

export type { SheetRoute };
