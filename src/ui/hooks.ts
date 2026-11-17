/**
 * Public hook surface for Arcus React components.
 *
 * The implementations live beside the contexts in
 * `providers/ArcusProvider.tsx` so the context objects can stay private.
 * This module keeps page imports short and stable.
 */
import { useSyncExternalStore } from "react";
import { useHistory } from "./providers/ArcusProvider";

export {
  useActions,
  useArcusStore,
  useAtmo,
  useAtmoMode,
  useBindings,
  useConfig,
  useDark,
  useHass,
  useHistory,
  useModel,
  useNow,
  useRange,
  useRoute,
  useTranslator,
} from "./providers/ArcusProvider";

/**
 * Re-render a chart when the history cache ingests or refreshes a series.
 * The cache keeps its own version counter, so this is a cheap subscription.
 */
export const useHistoryVersion = (): number => {
  const history = useHistory();
  // Test/story stubs may not implement the subscription yet.
  const subscribe = history.subscribe ?? (() => () => {});
  const getSnapshot = history.getVersion ?? (() => 0);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
