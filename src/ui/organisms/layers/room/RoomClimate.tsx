import { numberFrom } from "../../../../format";
import type { ArcusHass, Language, Translator } from "../../../../types";
import type { ArcusActions } from "../../../types";
import { c } from "../../../styles/classes";
import { refEntity } from "./room-state";
import { clamp, type RoomClimateView } from "./room-view";
import { RoomStepper } from "./RoomStepper";

export interface RoomClimateProps {
  climate: RoomClimateView | null;
  roomName: string;
  hass: ArcusHass;
  t: Translator;
  language: Language;
  actions: ArcusActions;
}

/** The room thermostat: stepper, on/off toggle, and setpoint note. */
export const RoomClimate = ({
  climate,
  roomName,
  hass,
  t,
  language,
  actions,
}: RoomClimateProps) => {
  if (!climate) return null;

  const { ref, entity, mode } = climate;
  const step = (direction: -1 | 1): void => {
    const live = refEntity(hass, ref);
    const current = numberFrom(live?.attributes?.temperature);
    const min = Number(live?.attributes?.min_temp ?? 5);
    const max = Number(live?.attributes?.max_temp ?? 35);
    if (current === null || !Number.isFinite(current)) return;
    const next = clamp(current + direction * 0.5, min, max);
    actions.callService(
      "climate",
      "set_temperature",
      { temperature: next },
      { entity_id: ref.entityId },
    );
  };

  const toggle = (): void => {
    const live = refEntity(hass, ref);
    const hvacModes = Array.isArray(live?.attributes?.hvac_modes)
      ? live.attributes.hvac_modes.map(String)
      : ["heat"];
    const nextOnMode = hvacModes.includes("heat")
      ? "heat"
      : hvacModes.includes("cool")
        ? "cool"
        : "heat_cool";
    actions.callService(
      "climate",
      "set_hvac_mode",
      { hvac_mode: live?.state === "off" ? nextOnMode : "off" },
      { entity_id: ref.entityId },
    );
  };

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.heating")}</div>
        <div className={c("block-label")}>
          <b>{mode === "off" ? t("room.heatingOff") : t("room.heatingOn")}</b>
        </div>
      </div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{roomName}</div>
          <div className={c("row-sub")}>
            {`${t("room.heatingNow", {
              temp: climate.currentText,
            })} · ${
              entity.attributes?.hvac_action === "heating"
                ? t("room.heatingActive")
                : mode === "cool" ||
                    entity.attributes?.hvac_action === "cooling"
                  ? t("room.cooling")
                  : t("room.heatingHolding")
            }`}
          </div>
        </span>
        <RoomStepper
          entityId={ref.entityId}
          value={climate.targetText}
          language={language}
          onStep={step}
        />
        <button
          type="button"
          className={c("toggle", mode !== "off" && "on")}
          data-act="hvac-toggle"
          data-entity={ref.entityId}
          data-not-off={ref.entityId}
          aria-label={t("common.toggle")}
          aria-pressed={mode !== "off"}
          onClick={toggle}
        />
      </div>
      <div className={c("block-note")}>
        {t("room.setpointNote", { temp: climate.targetText })}
      </div>
    </div>
  );
};
