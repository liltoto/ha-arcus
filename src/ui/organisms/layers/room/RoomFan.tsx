import { formatNumber } from "../../../../format";
import type { Language, Translator } from "../../../../types";
import type { ArcusActions } from "../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";
import { entityName } from "./room-state";
import type { RoomFanView } from "./room-view";

export interface RoomFanProps {
  fan: RoomFanView | null;
  t: Translator;
  language: Language;
  actions: ArcusActions;
}

/** The extraction hood with its filter runtime and reset button. */
export const RoomFan = ({ fan, t, language, actions }: RoomFanProps) => {
  if (!fan) return null;

  const { ref, entity } = fan;
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.hood")}</div>
        <div className={c("block-label")}>
          <b>{fan.on ? t("room.heatingOn") : t("room.heatingOff")}</b>
        </div>
      </div>
      <div className={c("row")}>
        <Icon name="fan" />
        <div className={c("row-main")}>
          <div className={c("row-name")}>{entityName(entity, "Thermex")}</div>
          <div className={c("row-sub")}>
            {t("room.filterTime", {
              hours: formatNumber(fan.filterHours, 1, language),
            })}
          </div>
        </div>
        <span className={c("row-val")}>
          {String(entity?.attributes?.preset_mode ?? "–")}
        </span>
      </div>
      <div className={c("btn-row")}>
        <button
          type="button"
          className={c("btn small")}
          data-act="toggle-switch"
          data-entity={ref.entityId}
          onClick={() =>
            actions.callService(
              "switch",
              "toggle",
              {},
              { entity_id: ref.entityId },
            )
          }
        >
          {t("room.toggle")}
        </button>
        {fan.resetId ? (
          <button
            type="button"
            className={c("btn small")}
            data-act="press-button"
            data-entity={fan.resetId}
            onClick={() =>
              actions.callService(
                "button",
                "press",
                {},
                { entity_id: fan.resetId },
              )
            }
          >
            {t("room.resetFilter")}
          </button>
        ) : null}
      </div>
    </div>
  );
};
