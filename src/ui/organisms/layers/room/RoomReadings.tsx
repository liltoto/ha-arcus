import type { HistoryCache } from "../../../../data/history";
import { formatNumber } from "../../../../format";
import type {
  ArcusHass,
  Language,
  RoomModel,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { c } from "../../../styles/classes";
import { RoomChartBlock } from "./RoomChartBlock";
import {
  RoomCo2Chart,
  RoomHumidityChart,
  RoomPm25Chart,
} from "./RoomSensorCharts";
import { RoomReadouts } from "./RoomReadouts";
import type { RoomView } from "./room-view";

export interface RoomReadingsProps {
  room: RoomModel;
  view: RoomView;
  history: HistoryCache;
  hass: ArcusHass;
  now: () => Date;
  t: Translator;
  language: Language;
  tempUnit: TemperatureUnit;
}

/**
 * The room readouts and the 24-hour temperature/humidity/CO2/PM2.5 charts.
 * Each optional sensor keeps its own chart block, exactly as the legacy
 * renderer emitted it.
 */
export function RoomReadings({
  room,
  view,
  history,
  hass,
  now,
  t,
  language,
  tempUnit,
}: RoomReadingsProps) {
  return (
    <>
      <RoomReadouts
        room={room}
        view={view}
        t={t}
        language={language}
        tempUnit={tempUnit}
      />
      {view.fallbackNote ? (
        <div className={c("block-note")}>{t("room.tempFallbackNote")}</div>
      ) : null}
      <RoomChartBlock
        title={t("room.chart24", { label: t("room.temperature") })}
        value={`${formatNumber(view.temp, 1, language)}°`}
        entityId={view.tempChartId}
        color="var(--sky)"
        height={120}
        unit={tempUnit}
        decimals={1}
        history={history}
        now={now}
        emptyLabel={t("empty.chart")}
        loadingLabel={t("empty.loading")}
        unavailableLabel={t("empty.unavailable")}
        unavailable={view.temp === null}
      />
      <RoomHumidityChart
        room={room}
        view={view}
        history={history}
        hass={hass}
        now={now}
        t={t}
        language={language}
      />
      <RoomCo2Chart
        room={room}
        view={view}
        history={history}
        hass={hass}
        now={now}
        t={t}
        language={language}
      />
      <RoomPm25Chart
        room={room}
        view={view}
        history={history}
        hass={hass}
        now={now}
        t={t}
        language={language}
      />
    </>
  );
}
