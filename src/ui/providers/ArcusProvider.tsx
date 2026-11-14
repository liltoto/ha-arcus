import { createContext, useContext, type Context } from "react";
import type { HistoryCache } from "../../data/history";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Translator,
} from "../../types";
import type {
  ArcusActions,
  ArcusProviderProps,
  ArcusRoute,
} from "../types";

export type { ArcusActions, ArcusProviderProps } from "../types";

/**
 * One small context per value. Keeping them separate means a `hass` state
 * update re-renders consumers of `useHass()` without touching components that
 * only need config, translations, or the action bridge.
 *
 * All defaults are `null`; the hooks turn a missing provider into a clear
 * error instead of a confusing `undefined` somewhere deep in a page.
 */
const HassContext = createContext<ArcusHass | null>(null);
const ModelContext = createContext<HomeModel | null>(null);
const ConfigContext = createContext<ArcusConfig | null>(null);
const TranslatorContext = createContext<Translator | null>(null);
const BindingsContext = createContext<Record<string, string> | null>(null);
const RouteContext = createContext<ArcusRoute | null>(null);
const ActionsContext = createContext<ArcusActions | null>(null);
const HistoryContext = createContext<HistoryCache | null>(null);
const NowContext = createContext<(() => Date) | null>(null);

function useRequired<T>(context: Context<T | null>, hook: string): T {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hook} must be used inside an <ArcusProvider>.`);
  }
  return value;
}

export function useHass(): ArcusHass {
  return useRequired(HassContext, "useHass");
}

export function useModel(): HomeModel {
  return useRequired(ModelContext, "useModel");
}

export function useConfig(): ArcusConfig {
  return useRequired(ConfigContext, "useConfig");
}

export function useTranslator(): Translator {
  return useRequired(TranslatorContext, "useTranslator");
}

export function useBindings(): Record<string, string> {
  return useRequired(BindingsContext, "useBindings");
}

export function useRoute(): ArcusRoute {
  return useRequired(RouteContext, "useRoute");
}

export function useActions(): ArcusActions {
  return useRequired(ActionsContext, "useActions");
}

export function useHistory(): HistoryCache {
  return useRequired(HistoryContext, "useHistory");
}

export function useNow(): () => Date {
  return useRequired(NowContext, "useNow");
}

/**
 * Exposes the card's current state and action bridge to the React tree.
 * Values are passed through by reference, so unchanged props keep their
 * identity across renders. `hass` and `model` intentionally are not
 * memoized: every Home Assistant state push replaces them.
 */
export function ArcusProvider({
  hass,
  model,
  config,
  t,
  bindings,
  route,
  actions,
  history,
  now,
  children,
}: ArcusProviderProps) {
  return (
    <HassContext.Provider value={hass}>
      <ModelContext.Provider value={model}>
        <ConfigContext.Provider value={config}>
          <TranslatorContext.Provider value={t}>
            <BindingsContext.Provider value={bindings}>
              <RouteContext.Provider value={route}>
                <ActionsContext.Provider value={actions}>
                  <HistoryContext.Provider value={history}>
                    <NowContext.Provider value={now}>
                      {children}
                    </NowContext.Provider>
                  </HistoryContext.Provider>
                </ActionsContext.Provider>
              </RouteContext.Provider>
            </BindingsContext.Provider>
          </TranslatorContext.Provider>
        </ConfigContext.Provider>
      </ModelContext.Provider>
    </HassContext.Provider>
  );
}
