import type { AtmosphereSetting } from "../../types";
import { Icon } from "../atoms/Icon";
import {
  useActions,
  useAtmoMode,
  useBindings,
  useConfig,
  useModel,
  useTranslator,
} from "../hooks";
import { c } from "../styles/classes";

/** The atmosphere cycle mirrors the card's `_cycleAtmo` order. */
const ATMO_ORDER: AtmosphereSetting[] = ["auto", "night", "day"];

const atmoIcon = (mode: AtmosphereSetting): string => {
  if (mode === "night") return "moon";
  if (mode === "day") return "sun";
  return "spark";
};

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
export const TopBar = ({ className }: TopBarProps = {}) => {
  const config = useConfig();
  const t = useTranslator();
  const bindings = useBindings();
  const model = useModel();
  const actions = useActions();
  const atmo = useAtmoMode();

  // The card resolves the configured/first person once per publish, so the
  // dot and the label below can never disagree.
  const personHome = bindings.personHome === "1";

  const cycleAtmo = () => {
    const next = ATMO_ORDER[(ATMO_ORDER.indexOf(atmo) + 1) % ATMO_ORDER.length];
    actions.setAtmo(next);
  };

  const atmoLabel =
    atmo === "auto"
      ? t("brand.atmosphereAuto")
      : t("brand.atmosphereMode", { mode: atmo });

  return (
    <div className={c("topbar-inner", className)}>
      <button
        type="button"
        className={c("brand")}
        data-nav="hjem"
        aria-label={t("brand.homeAria")}
        onClick={() => actions.navigate("hjem")}
      >
        <span className={c("brand-mark")}>
          <Icon name="sun" />
        </span>
        <span>
          <span className={c("brand-word")}>
            {(config.title || "HJEM").toLocaleUpperCase()}
          </span>
          <span className={c("brand-sub")}>
            {(config.subtitle || "ARCUS").toLocaleUpperCase()}
          </span>
        </span>
      </button>

      <div className={c("topbar-date")}>{bindings.date}</div>

      <div className={c("topbar-right")}>
        <span className={c("pill name")}>
          <span
            className={c("dot")}
            style={{ background: personHome ? "var(--sage)" : "var(--muted)" }}
          />
          <span>{bindings.person ?? "–"}</span>
        </span>

        <button
          type="button"
          className={c("pill warn")}
          data-nav="alarmer"
          hidden={model.alerts.length === 0}
          onClick={() => actions.navigate("alarmer")}
        >
          <span className={c("dot")} />
          <span>{bindings.alertPill}</span>
        </button>

        <button
          type="button"
          className={c("icon-btn")}
          data-act="atmo"
          title={atmoLabel}
          aria-label={atmoLabel}
          onClick={cycleAtmo}
        >
          <Icon name={atmoIcon(atmo)} />
        </button>

        <button
          type="button"
          className={c("icon-btn")}
          data-nav="alle"
          aria-label={t("brand.allLayers")}
          onClick={() => actions.navigate("alle")}
        >
          <Icon name="menu" />
        </button>
      </div>
    </div>
  );
};
