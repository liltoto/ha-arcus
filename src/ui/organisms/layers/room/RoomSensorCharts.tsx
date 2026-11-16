import type { HistoryCache } from "../../../../data/history";
import { formatNumber } from "../../../../format";
import type {
  ArcusHass,
  EntityRef,
  Language,
  RoomModel,
  Translator,
} from "../../../../types";
import { RoomChartBlock } from "./RoomChartBlock";
import { refEntity } from "./room-state";
import type { RoomView } from "./room-view";

interface RoomSensorChartProps {
  room: RoomModel;
  view: RoomView;
  history: HistoryCache;
  hass: ArcusHass;
  now: () => Date;
  t: Translator;
  language: Language;
}

/** A sensor that exists but currently reports no usable reading. */
const isUnavailable = (
  hass: ArcusHass,
  ref: EntityRef | null | undefined,
): boolean => {
  const state = refEntity(hass, ref)?.state;
  return state === "unavailable" || state === "unknown";
};

export const RoomHumidityChart = ({
  room,
  view,
  history,
  hass,
  now,
  t,
}: RoomSensorChartProps) => {
  if (!room.humidity) return null;
  return (
    <RoomChartBlock
      title={t("room.chart24", { label: t("room.humidity") })}
      value={view.humidity === null ? "–" : `${Math.round(view.humidity)} %`}
      entityId={room.humidity.entityId}
      color="var(--sky)"
      height={100}
      unit="%"
      decimals={0}
      history={history}
      now={now}
      emptyLabel={t("empty.chart")}
      loadingLabel={t("empty.loading")}
      unavailableLabel={t("empty.unavailable")}
      unavailable={isUnavailable(hass, room.humidity)}
    />
  );
};

export const RoomCo2Chart = ({
  room,
  view,
  history,
  hass,
  now,
  t,
}: RoomSensorChartProps) => {
  if (!room.co2) return null;
  return (
    <RoomChartBlock
      title={t("room.chart24", { label: t("room.co2") })}
      value={view.co2 === null ? "–" : `${Math.round(view.co2)} ppm`}
      entityId={room.co2.entityId}
      color="var(--sage)"
      height={100}
      unit="ppm"
      decimals={0}
      history={history}
      now={now}
      emptyLabel={t("empty.chart")}
      loadingLabel={t("empty.loading")}
      unavailableLabel={t("empty.unavailable")}
      unavailable={isUnavailable(hass, room.co2)}
    />
  );
};

export const RoomPm25Chart = ({
  room,
  view,
  history,
  hass,
  now,
  t,
  language,
}: RoomSensorChartProps) => {
  if (!room.pm25) return null;
  return (
    <RoomChartBlock
      title={t("room.chart24", { label: t("room.pm25") })}
      value={view.pm25 === null ? "–" : formatNumber(view.pm25, 1, language)}
      entityId={room.pm25.entityId}
      color="var(--brass)"
      height={90}
      unit="µg/m³"
      decimals={1}
      history={history}
      now={now}
      emptyLabel={t("empty.chart")}
      loadingLabel={t("empty.loading")}
      unavailableLabel={t("empty.unavailable")}
      unavailable={isUnavailable(hass, room.pm25)}
    />
  );
};
