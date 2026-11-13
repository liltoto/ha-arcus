/**
 * Arcus dashboard strategy.
 *
 * A Home Assistant dashboard strategy is a custom element whose static
 * `generate()` returns the dashboard configuration. Arcus generates one panel
 * view that contains a single `custom:arcus-card`; the card itself discovers
 * rooms and renders the dynamic home view.
 *
 * Importing this module registers both the strategy element and the
 * `window.customStrategies` entry used by the dashboard editor.
 */
import { normalizeConfig } from "./config";
import type { ArcusConfig, ArcusConfigInput, ArcusHass } from "./types";

/** The custom element tag Home Assistant resolves for `custom:arcus`. */
export const ARCUS_STRATEGY_TAG = "ll-strategy-dashboard-arcus";

/** The strategy name without the `custom:` prefix. */
export const ARCUS_STRATEGY_TYPE = "arcus";

/**
 * Strategy configuration stored in the dashboard's `strategy` block.
 *
 * The strategy accepts every card option at the top level. `card` is an
 * optional nested override so a dashboard can keep the strategy options and the
 * card options separate.
 */
export interface ArcusStrategyConfig extends ArcusConfigInput {
  dashboard_title?: string;
  view_title?: string;
  card?: ArcusConfigInput;
}

/** The normalized card configuration embedded in the generated view. */
export type ArcusStrategyCardConfig = ArcusConfig & {
  type: "custom:arcus-card";
};

export interface ArcusDashboardView {
  type: "panel";
  path: string;
  title: string;
  icon: string;
  cards: ArcusStrategyCardConfig[];
}

export interface ArcusDashboardConfig {
  title: string;
  views: ArcusDashboardView[];
}

/** Shape of an entry in Home Assistant's `window.customStrategies` list. */
export interface CustomStrategyInfo {
  type: string;
  strategyType: "dashboard" | "section";
  name?: string;
  description?: string;
  documentationURL?: string;
}

declare global {
  interface Window {
    customStrategies?: CustomStrategyInfo[];
  }
}

/** The entry shown in the dashboard editor's community dashboard picker. */
export const ARCUS_CUSTOM_STRATEGY: CustomStrategyInfo = {
  type: ARCUS_STRATEGY_TYPE,
  strategyType: "dashboard",
  name: "Arcus",
  description:
    "A calm, day-arc dashboard for Home Assistant. Rooms and chapters follow your areas, devices, and entities.",
  documentationURL: "https://github.com/liltoto/ha-arcus",
};

function readText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export class ArcusDashboardStrategy extends HTMLElement {
  /**
   * Regenerate when the registries Arcus discovers rooms from change. Entity
   * state changes alone do not require a new dashboard configuration.
   */
  static registryDependencies = ["areas", "devices", "entities", "floors"];

  static async generate(
    config: ArcusStrategyConfig,
    hass: ArcusHass,
  ): Promise<ArcusDashboardConfig> {
    void hass;
    const strategyConfig: ArcusStrategyConfig = config ?? {};
    const cardInput = strategyConfig.card ?? strategyConfig;
    const card: ArcusStrategyCardConfig = {
      ...normalizeConfig(cardInput),
      type: "custom:arcus-card",
    };

    return {
      title:
        readText(strategyConfig.dashboard_title) ??
        readText(strategyConfig.title) ??
        "Arcus",
      views: [
        {
          type: "panel",
          path: "hjem",
          title: readText(strategyConfig.view_title) ?? "Hjem",
          icon: "mdi:weather-sunset",
          cards: [card],
        },
      ],
    };
  }

  static getCreateSuggestions(hass: ArcusHass): {
    title: string;
    icon: string;
  } {
    void hass;
    return { title: "Arcus", icon: "mdi:weather-sunset" };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("arcus-strategy-editor");
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get(ARCUS_STRATEGY_TAG)
) {
  customElements.define(ARCUS_STRATEGY_TAG, ArcusDashboardStrategy);
}

if (typeof window !== "undefined") {
  window.customStrategies = window.customStrategies ?? [];
  const alreadyRegistered = window.customStrategies.some(
    (entry) =>
      entry.type === ARCUS_CUSTOM_STRATEGY.type &&
      entry.strategyType === ARCUS_CUSTOM_STRATEGY.strategyType,
  );
  if (!alreadyRegistered) {
    window.customStrategies.push({ ...ARCUS_CUSTOM_STRATEGY });
  }
}
