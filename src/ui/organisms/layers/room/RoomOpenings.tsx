import type { ArcusHass, OpeningModel, Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";
import { isOn, openingIcon } from "./room-state";
import { relativeChanged } from "./room-view";

export interface RoomOpeningsProps {
  hass: ArcusHass;
  openings: OpeningModel[];
  open: number;
  t: Translator;
  nowMs: number;
}

/** The room's doors, windows, and other contact sensors. */
export const RoomOpenings = ({
  hass,
  openings,
  open,
  t,
  nowMs,
}: RoomOpeningsProps) => {
  if (!openings.length) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.openings")}</div>
        <div className={c("block-label")}>
          <b>
            {open
              ? t("room.openCount", { count: open })
              : t("common.allClosedLower")}
          </b>
        </div>
      </div>
      <div className={c("list")}>
        {openings.map((opening) => {
          const on = isOn(hass, opening.id);
          const relative = relativeChanged(hass, t, nowMs, opening.id);
          return (
            <div
              className={c("row", on && "open")}
              data-open={opening.id}
              key={opening.id}
            >
              <Icon name={openingIcon(opening.kind)} />
              <div className={c("row-main")}>
                <div className={c("row-name")}>{opening.name}</div>
                <div className={c("row-sub")}>
                  {`${opening.kind} · ${
                    on ? t("common.open") : t("common.closed")
                  } ${relative}`}
                </div>
              </div>
              <span className={c("status-line")}>
                <i className={c("dot", on && "warn")} />
                {on ? t("common.openUpper") : t("common.closedUpper")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
