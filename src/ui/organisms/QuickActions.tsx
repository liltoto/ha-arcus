import { firstEntity } from "../../actions";
import { Icon } from "../atoms/Icon";
import { useActions, useConfig, useHass, useTranslator } from "../hooks";
import { c } from "../styles/classes";

const BEDTIME = "input_button.bedtime";
const VACATION = "input_boolean.vacation_mode";
const WINDOW_ALERT = "input_boolean.window_alert_notification";

interface QuickButtonProps {
  icon: string;
  label: string;
  on?: boolean;
  act?: string;
  entity?: string;
  dataOn?: string;
  nav?: string;
  quick?: number;
  onClick: () => void;
}

/**
 * Local button for the quick rows. The `QuickAction` molecule only exposes
 * icon/label/on, while the card still patches these `data-*` hooks.
 */
function QuickButton({
  icon,
  label,
  on = false,
  act,
  entity,
  dataOn,
  nav,
  quick,
  onClick,
}: QuickButtonProps) {
  return (
    <button
      type="button"
      className={c("quick", on && "on")}
      data-act={act}
      data-entity={entity}
      data-on={dataOn}
      data-nav={nav}
      data-quick={quick}
      aria-pressed={on || undefined}
      onClick={onClick}
    >
      <Icon name={icon} />
      {label}
    </button>
  );
}

/**
 * Configured quick actions, or the legacy default shortcuts when the config
 * has none. The section is its own wrapper because the home template no
 * longer supplies one.
 */
export function QuickActions() {
  const config = useConfig();
  const t = useTranslator();
  const hass = useHass();
  const actions = useActions();

  const configured = config.quick_actions.length > 0;
  const hasBedtime = Boolean(hass.states?.[BEDTIME]);
  const hasVacation = Boolean(hass.states?.[VACATION]);
  const hasWindowAlert = Boolean(hass.states?.[WINDOW_ALERT]);

  const isOn = (entity: string) => hass.states?.[entity]?.state === "on";

  const openMap = () => {
    try {
      window.history.pushState(null, "", "/map");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent("location-changed", { bubbles: true, composed: true }),
    );
  };

  return (
    <section className={c("section")}>
      <div className={c("section-head")}>
        <div>
          <div className={c("kicker")}>{t("section.quickKicker")}</div>
          <h2>{t("section.quickTitle")}</h2>
        </div>
        <div className={c("meta")}>
          {t("section.quickMeta")}
          <br />
          <b>{t("section.quickMetaSub")}</b>
        </div>
      </div>
      <div className={c("quick-row")}>
        {configured
          ? config.quick_actions.map((quick, index) => {
              const entity = quick.entity ?? firstEntity(quick.action);
              const toggle = quick.action.action === "toggle";
              const on =
                toggle && entity
                  ? hass.states?.[entity]?.state === "on"
                  : false;
              return (
                <QuickButton
                  key={`${quick.label}-${index}`}
                  icon={quick.icon || "spark"}
                  label={quick.label}
                  on={on}
                  act="quick"
                  dataOn={toggle ? entity : undefined}
                  quick={index}
                  onClick={() => actions.performAction(quick.action)}
                />
              );
            })
          : null}
        {!configured && hasBedtime ? (
          <QuickButton
            icon="moon"
            label={t("quick.bedtime")}
            act="press"
            entity={BEDTIME}
            onClick={() =>
              actions.callService(
                "input_button",
                "press",
                {},
                { entity_id: BEDTIME },
              )
            }
          />
        ) : null}
        {!configured && hasVacation ? (
          <QuickButton
            icon="car"
            label={t("quick.vacation")}
            on={isOn(VACATION)}
            act="toggle-bool"
            entity={VACATION}
            dataOn={VACATION}
            onClick={() =>
              actions.callService(
                "input_boolean",
                "toggle",
                {},
                { entity_id: VACATION },
              )
            }
          />
        ) : null}
        {!configured && hasWindowAlert ? (
          <QuickButton
            icon="wind"
            label={t("quick.windowAlert")}
            on={isOn(WINDOW_ALERT)}
            act="toggle-bool"
            entity={WINDOW_ALERT}
            dataOn={WINDOW_ALERT}
            onClick={() =>
              actions.callService(
                "input_boolean",
                "toggle",
                {},
                { entity_id: WINDOW_ALERT },
              )
            }
          />
        ) : null}
        {!configured ? (
          <QuickButton
            icon="light"
            label={t("quick.lights")}
            nav="lys"
            onClick={() => actions.navigate("lys")}
          />
        ) : null}
        {!configured ? (
          <QuickButton
            icon="map"
            label={t("quick.map")}
            act="map"
            onClick={openMap}
          />
        ) : null}
      </div>
    </section>
  );
}
