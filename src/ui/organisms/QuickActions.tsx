import { useMemo } from "react";
import { useStore } from "zustand";
import { firstEntity } from "../../actions";
import { Icon } from "../atoms/Icon";
import { useActions, useArcusStore, useConfig, useTranslator } from "../hooks";
import { c } from "../styles/classes";

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
const QuickButton = ({
  icon,
  label,
  on = false,
  act,
  entity,
  dataOn,
  nav,
  quick,
  onClick,
}: QuickButtonProps) => {
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
};

/**
 * Configured quick actions, or the legacy default shortcuts when the config
 * has none. The section is its own wrapper because the home template no
 * longer supplies one.
 */
export const QuickActions = () => {
  const config = useConfig();
  const t = useTranslator();
  const store = useArcusStore();
  const actions = useActions();

  const configured = config.quick_actions.length > 0;

  /**
   * The toggle entities this section cares about. With no configured toggles
   * the list is empty, so the selector below always returns the same string
   * and an unrelated state push cannot re-render this section.
   */
  const toggleEntities = useMemo(
    () =>
      config.quick_actions
        .filter((quick) => quick.action.action === "toggle")
        .map((quick) => quick.entity ?? firstEntity(quick.action))
        .filter((entity): entity is string => Boolean(entity)),
    [config.quick_actions],
  );

  // A string snapshot subscribes to only those entities: Zustand compares the
  // selector result, so a changed room sensor leaves it untouched.
  const toggleStates = useStore(store, (state) =>
    toggleEntities
      .map((entity) => `${entity}:${state.hass.states?.[entity]?.state ?? ""}`)
      .join("|"),
  );

  const onEntities = useMemo(() => {
    const entities = new Set<string>();
    for (const pair of toggleStates.split("|")) {
      if (!pair.endsWith(":on")) continue;
      entities.add(pair.slice(0, pair.lastIndexOf(":")));
    }
    return entities;
  }, [toggleStates]);

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
              const on = toggle && entity ? onEntities.has(entity) : false;
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
};
