import { useState } from "react";
import type { AtmosphereSetting } from "../../types";
import { Icon } from "../atoms/Icon";
import {
  useActions,
  useBindings,
  useConfig,
  useHass,
  useModel,
  useTranslator,
} from "../hooks";

/** The atmosphere cycle mirrors the card's `_cycleAtmo` order. */
const ATMO_ORDER: AtmosphereSetting[] = ["auto", "night", "day"];

function atmoIcon(mode: AtmosphereSetting): string {
  if (mode === "night") return "moon";
  if (mode === "day") return "sun";
  return "spark";
}

export interface TopBarProps {
  className?: string;
}

/**
 * Brand, date, presence, alerts, and atmosphere controls for the home view.
 *
 * The markup mirrors the legacy `renderHome` top bar so the card's navigation
 * and theme contracts keep working. The atmosphere button intentionally has no
 * `data-atmo-btn`: the card's legacy `_applyAtmo` rewrites that button's icon,
 * and React owns it now.
 */
export function TopBar({ className }: TopBarProps = {}) {
  const config = useConfig();
  const t = useTranslator();
  const bindings = useBindings();
  const model = useModel();
  const actions = useActions();
  const hass = useHass();
  const [atmo, setAtmo] = useState<AtmosphereSetting>("auto");

  const personHome = Object.keys(hass.states).some(
    (entityId) =>
      entityId.startsWith("person.") && hass.states[entityId]?.state === "home",
  );

  const cycleAtmo = () => {
    const next = ATMO_ORDER[(ATMO_ORDER.indexOf(atmo) + 1) % ATMO_ORDER.length];
    setAtmo(next);
    actions.setAtmo(next);
  };

  return (
    <div className={className ? `topbar-inner ${className}` : "topbar-inner"}>
      <button
        type="button"
        className="brand"
        data-nav="hjem"
        aria-label={t("brand.homeAria")}
        onClick={() => actions.navigate("hjem")}
      >
        <span className="brand-mark">
          <Icon name="sun" />
        </span>
        <span>
          <span className="brand-word">
            {(config.title || "HJEM").toLocaleUpperCase()}
          </span>
          <span className="brand-sub">
            {(config.subtitle || "ARCUS").toLocaleUpperCase()}
          </span>
        </span>
      </button>

      <div className="topbar-date">{bindings.date}</div>

      <div className="topbar-right">
        <span className="pill name">
          <span
            className="dot"
            style={{ background: personHome ? "var(--sage)" : "var(--muted)" }}
          />
          <span>{bindings.person ?? "–"}</span>
        </span>

        <button
          type="button"
          className="pill warn"
          data-nav="alarmer"
          hidden={model.alerts.length === 0}
          onClick={() => actions.navigate("alarmer")}
        >
          <span className="dot" />
          <span>{bindings.alertPill}</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          data-act="atmo"
          title={t("brand.atmosphere")}
          aria-label={t("brand.atmosphere")}
          onClick={cycleAtmo}
        >
          <Icon name={atmoIcon(atmo)} />
        </button>

        <button
          type="button"
          className="icon-btn"
          data-nav="alle"
          aria-label={t("brand.allLayers")}
          onClick={() => actions.navigate("alle")}
        >
          <Icon name="menu" />
        </button>
      </div>
    </div>
  );
}
