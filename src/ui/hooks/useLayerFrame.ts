import type { HistoryCache } from "../../data/history";
import type { ResolvedHistoryRange } from "../../range";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Translator,
} from "../../types";
import { useHistoryVersion } from "../hooks";
import {
  useActions,
  useConfig,
  useHass,
  useHistory,
  useModel,
  useNow,
  useRange,
  useTranslator,
} from "../providers/ArcusProvider";
import type { ArcusActions } from "../types";

/** The non-history context surface every layer body shares. */
export interface LayerFrame {
  hass: ArcusHass;
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  now: () => Date;
  actions: ArcusActions;
}

/** A layer frame plus the history cache, range, and version subscription. */
export interface HistoryFrame extends LayerFrame {
  history: HistoryCache;
  range: ResolvedHistoryRange;
}

/**
 * Collapse the repeated context preamble in sheet bodies. Kept separate from
 * `useHistoryFrame` so sheets without charts do not subscribe to history
 * version bumps just to read the other contexts.
 */
const useLayerFrame = (): LayerFrame => {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const now = useNow();
  const actions = useActions();

  return { hass, model, config, t, now, actions };
};

/** Use in chart-bearing sheets; re-renders when the history cache ingests. */
export const useHistoryFrame = (): HistoryFrame => {
  const frame = useLayerFrame();
  const history = useHistory();
  const range = useRange();
  useHistoryVersion();

  return { ...frame, history, range };
};
