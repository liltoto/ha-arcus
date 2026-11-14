import type { Translator } from "../../../../types";
import type { ArcusActions } from "../../../types";
import { Icon } from "../../../atoms/Icon";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import { entityName } from "./room-state";
import type {
  RoomBatteryView,
  RoomMediaView,
  RoomMotionView,
} from "./room-view";

export interface RoomMotionBlockProps {
  view: RoomMotionView | null;
  t: Translator;
}

/** Motion and illuminance for a room with a motion sensor. */
export function RoomMotionBlock({ view, t }: RoomMotionBlockProps) {
  if (!view) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.motionLight")}</div>
      </div>
      <div className={c("readings")}>
        <Readout
          label={t("room.motion")}
          value={view.on ? t("room.active") : t("room.calm")}
        />
        <Readout
          label={t("room.illuminance")}
          value={view.lux === null ? "–" : String(Math.round(view.lux))}
          unit="lx"
        />
      </div>
    </div>
  );
}

export interface RoomBatteryBlockProps {
  view: RoomBatteryView | null;
  roomName: string;
  t: Translator;
}

/** The room's battery-powered sensor. */
export function RoomBatteryBlock({ view, roomName, t }: RoomBatteryBlockProps) {
  if (!view) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.battery")}</div>
      </div>
      <div className={c("row")}>
        <Icon name="battery" />
        <div className={c("row-main")}>
          <div className={c("row-name")}>
            {entityName(view.entity, t("room.battery"))}
          </div>
          <div className={c("row-sub")}>{roomName}</div>
        </div>
        <span className={c("row-val")}>
          {view.level === null ? "–" : Math.round(view.level)}
          <small>%</small>
        </span>
      </div>
    </div>
  );
}

export interface RoomMediaBlockProps {
  view: RoomMediaView | null;
  roomName: string;
  t: Translator;
  actions: ArcusActions;
}

/** The room media player with a play/pause button. */
export function RoomMediaBlock({
  view,
  roomName,
  t,
  actions,
}: RoomMediaBlockProps) {
  if (!view) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.media")}</div>
        <div className={c("block-label")}>
          <b>{view.stateText}</b>
        </div>
      </div>
      <div className={c("row")}>
        <Icon name="play" />
        <div className={c("row-main")}>
          <div className={c("row-name")}>
            {entityName(view.entity, t("room.soundbar"))}
          </div>
          <div className={c("row-sub")}>{roomName}</div>
        </div>
        <button
          type="button"
          className={c("icon-btn")}
          data-act="media-toggle"
          data-entity={view.ref.entityId}
          aria-label={t("room.playing")}
          onClick={() =>
            actions.callService(
              "media_player",
              "media_play_pause",
              {},
              { entity_id: view.ref.entityId },
            )
          }
        >
          <Icon name={view.state === "playing" ? "pause" : "play"} />
        </button>
      </div>
    </div>
  );
}
