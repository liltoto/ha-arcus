import { Fragment } from "react";
import type { ArcusHass, LightGroupModel, Translator } from "../../../../types";
import type { LightActions } from "../../../hooks/useLightActions";
import { c } from "../../../styles/classes";
import { RoomLightRow } from "./RoomLightRow";
import { lightName, lightStateFor } from "./room-state";

export interface RoomLightsProps {
  hass: ArcusHass;
  lights: LightGroupModel[];
  on: number;
  total: number;
  t: Translator;
  actions: LightActions;
}

/** The room light groups, with member groups collapsed into `<details>`. */
export const RoomLights = ({
  hass,
  lights,
  on,
  total,
  t,
  actions,
}: RoomLightsProps) => {
  if (!lights.length) return null;

  const light = (entityId: string, name: string, showSlider: boolean) => {
    const state = lightStateFor(hass, entityId);
    return (
      <RoomLightRow
        key={entityId}
        entityId={entityId}
        name={name}
        isOn={state.isOn}
        brightness={state.pct}
        showSlider={showSlider}
        t={t}
        onToggle={() => actions.toggle(entityId)}
        onBrightness={(percent) => actions.setBrightness(entityId, percent)}
      />
    );
  };

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.lights")}</div>
        <div className={c("block-label")}>
          <b>{t("room.lightCountOf", { on, total })}</b>
        </div>
      </div>
      <div className={c("list")}>
        {lights.map((group) => (
          <Fragment key={group.entityId}>
            {light(group.entityId, group.name, true)}
            {group.members.length ? (
              <details className={c("light-details")}>
                <summary>
                  {t("room.singleLights", {
                    count: group.members.length,
                  })}
                </summary>
                {group.members.map((id) =>
                  light(id, lightName(hass, id), false),
                )}
              </details>
            ) : null}
            {group.extra.map((id) => light(id, lightName(hass, id), true))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};
