import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { HistoryCache } from "../../data/history";
import type { ResolvedHistoryRange } from "../../range";
import type {
  ArcusConfig,
  ArcusHass,
  AtmosphereSetting,
  HomeModel,
  Translator,
} from "../../types";
import type {
  ArcusActions,
  ArcusProviderProps,
  ArcusRoute,
  ArcusStore,
} from "../types";

export type { ArcusActions, ArcusProviderProps } from "../types";

/**
 * One context carries the store instance, not its values. Each hook below
 * subscribes to a single slice, so a `hass` push re-renders the components
 * that read state without touching config, translations, or routing.
 *
 * The store is created per card (or test/story harness), so two providers on
 * one page never share state.
 */
const StoreContext = createContext<ArcusStore | null>(null);

const useRequiredStore = (hook: string): ArcusStore => {
  const store = useContext(StoreContext);
  if (store === null) {
    throw new Error(`${hook} must be used inside an <ArcusProvider>.`);
  }
  return store;
};

/** The raw store, for advanced selectors in tests and stories. */
export const useArcusStore = (): ArcusStore => {
  return useRequiredStore("useArcusStore");
};

export const useHass = (): ArcusHass => {
  const store = useRequiredStore("useHass");
  return useStore(store, (state) => state.hass);
};

export const useModel = (): HomeModel => {
  const store = useRequiredStore("useModel");
  return useStore(store, (state) => state.model);
};

export const useConfig = (): ArcusConfig => {
  const store = useRequiredStore("useConfig");
  return useStore(store, (state) => state.config);
};

export const useTranslator = (): Translator => {
  const store = useRequiredStore("useTranslator");
  return useStore(store, (state) => state.t);
};

export const useBindings = (): Record<string, string> => {
  const store = useRequiredStore("useBindings");
  return useStore(store, (state) => state.bindings);
};

export const useRoute = (): ArcusRoute => {
  const store = useRequiredStore("useRoute");
  return useStore(store, (state) => state.route);
};

export const useActions = (): ArcusActions => {
  const store = useRequiredStore("useActions");
  return useStore(store, (state) => state.actions);
};

export const useHistory = (): HistoryCache => {
  const store = useRequiredStore("useHistory");
  return useStore(store, (state) => state.history);
};

export const useNow = (): (() => Date) => {
  const store = useRequiredStore("useNow");
  return useStore(store, (state) => state.now);
};

export const useRange = (): ResolvedHistoryRange => {
  const store = useRequiredStore("useRange");
  return useStore(store, (state) => state.range);
};

export const useAtmo = (): AtmosphereSetting => {
  const store = useRequiredStore("useAtmo");
  return useStore(store, (state) => state.atmo);
};

export const useAtmoMode = (): AtmosphereSetting => {
  const store = useRequiredStore("useAtmoMode");
  return useStore(store, (state) => state.atmoMode);
};

export const useDark = (): boolean => {
  const store = useRequiredStore("useDark");
  return useStore(store, (state) => state.dark);
};

/**
 * Injects the card's store. Values are not copied or memoized here; the card
 * publishes a new snapshot into the store.
 */
export const ArcusProvider = ({ store, children }: ArcusProviderProps) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};
