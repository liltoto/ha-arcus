import { type CSSProperties } from "react";
import { resolveTempUnit } from "../../../format";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { EmptyState } from "../../atoms/EmptyState";
import { SheetHeader } from "../../molecules/SheetHeader";
import { useRangeEnsure } from "../../hooks/useHistoryRange";
import { useHistoryFrame } from "../../hooks/useLayerFrame";
import { useLightActions } from "../../hooks/useLightActions";
import { c } from "../../styles/classes";
import { RoomClimate } from "./room/RoomClimate";
import { RoomCovers, RoomLock } from "./room/RoomCovers";
import {
  RoomBatteryBlock,
  RoomMediaBlock,
  RoomMotionBlock,
} from "./room/RoomEnvironment";
import { RoomFan } from "./room/RoomFan";
import { RoomLights } from "./room/RoomLights";
import { RoomOpenings } from "./room/RoomOpenings";
import { RoomReadings } from "./room/RoomReadings";
import { resolveRoom } from "./room/room-state";
import {
  resolveBatteryView,
  resolveClimateView,
  resolveFanView,
  resolveMediaView,
  resolveMotionView,
  resolveRoomView,
  temperatureChartId,
} from "./room/room-view";

const LAYER_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  minHeight: 0,
};

/**
 * The room sheet, ported from `views/layers/room.ts`.
 *
 * `route.base === "skur"` is the special top-level shed route; every other
 * room uses `route.sub`. Unknown rooms fall back to the first indoor room,
 * matching the prototype's first-room fallback.
 */
export const RoomBody = ({ route }: LayerBodyProps) => {
  const { hass, model, config, t, history, range, now, actions } =
    useHistoryFrame();
  const lightActions = useLightActions();

  const room = resolveRoom(model, route);
  const language = model.language;
  const tempUnit = resolveTempUnit(hass, config);
  const nowMs = now().getTime();

  // The chart ids, not the hass object: a state push that leaves the room's
  // sensors alone must not re-run the range fetch.
  const historyIds = room
    ? [
        temperatureChartId(hass, room),
        room.humidity?.entityId,
        room.co2?.entityId,
        room.pm25?.entityId,
      ]
    : [];
  useRangeEnsure(historyIds);

  if (!room) {
    return (
      <div data-react-layer style={LAYER_STYLE}>
        <SheetHeader
          kicker={t("sheet.kickerRoom")}
          title={t("empty.rooms")}
          sum=""
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className={c("sheet-scroll")}>
          <EmptyState icon="home" title={t("empty.dataYet")} />
        </div>
      </div>
    );
  }

  const view = resolveRoomView(hass, model, room, t, language);
  const climate = resolveClimateView(hass, room.climate, language);
  const fan = resolveFanView(hass, room);
  const motion = resolveMotionView(hass, room);
  const battery = resolveBatteryView(hass, room);
  const media = resolveMediaView(hass, room, t);

  return (
    <div data-react-layer style={LAYER_STYLE}>
      <SheetHeader
        kicker={t("sheet.kickerRoom")}
        title={room.name}
        sum={view.summary}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <RoomReadings
          room={room}
          view={view}
          history={history}
          hass={hass}
          range={range}
          now={now}
          t={t}
          language={language}
          tempUnit={tempUnit}
        />
        <RoomLights
          hass={hass}
          lights={room.lights}
          on={view.stat.lightsOn}
          total={view.stat.lightsTotal}
          t={t}
          actions={lightActions}
        />
        <RoomOpenings
          hass={hass}
          openings={room.openings}
          open={view.stat.open}
          t={t}
          nowMs={nowMs}
        />
        <RoomCovers covers={room.covers} hass={hass} t={t} actions={actions} />
        <RoomLock lock={room.lock} hass={hass} t={t} actions={actions} />
        <RoomClimate
          climate={climate}
          roomName={room.name}
          hass={hass}
          t={t}
          language={language}
          actions={actions}
        />
        <RoomFan fan={fan} t={t} language={language} actions={actions} />
        <RoomMotionBlock view={motion} t={t} />
        <RoomBatteryBlock view={battery} roomName={room.name} t={t} />
        <RoomMediaBlock
          view={media}
          roomName={room.name}
          t={t}
          actions={actions}
        />
        <div className={c("note")}>{t("room.liveNote")}</div>
      </div>
    </div>
  );
};
