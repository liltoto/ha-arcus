import type { HistoryCache } from "../../../../data/history";
import { formatNumber } from "../../../../format";
import type { Language, RoomModel, Translator } from "../../../../types";
import { RoomChartBlock } from "./RoomChartBlock";
import type { RoomView } from "./room-view";

interface RoomSensorChartProps {
  room: RoomModel;
  view: RoomView;
  history: HistoryCache;
  now: () => Date;
  t: Translator;
  language: Language;
}

export function RoomHumidityChart({
  room,
  view,
  history,
  now,
  t,
}: RoomSensorChartProps) {
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
    />
  );
}

export function RoomCo2Chart({
  room,
  view,
  history,
  now,
  t,
}: RoomSensorChartProps) {
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
    />
  );
}

export function RoomPm25Chart({
  room,
  view,
  history,
  now,
  t,
  language,
}: RoomSensorChartProps) {
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
    />
  );
}
