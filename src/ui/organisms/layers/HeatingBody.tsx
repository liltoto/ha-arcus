import { resolveTempUnit } from "../../../format";
import { clipSeries, rangePeriodLabel } from "../../../range";
import { areaPath, sparkPath } from "../../../render/charts";
import type { HeatingModel } from "../../../types";
import {
  chartStateFor,
  rangeStatusFor,
  useRangeEnsure,
} from "../../hooks/useHistoryRange";
import { useHistoryFrame } from "../../hooks/useLayerFrame";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";
import { HeatingChart } from "./heating/HeatingChart";
import { liveState } from "./heating/heating-state";
import { HeatingLimits } from "./heating/HeatingLimits";
import { HeatingReserve } from "./heating/HeatingReserve";
import { HeatingZones } from "./heating/HeatingZones";
import {
  chartSource,
  CHART_HEIGHT,
  heatingLimits,
  heatingStrip,
  isOpeningOn,
} from "./heating/helpers";

/** Underfloor heating: the discovered climate zones plus reserve channels. */
export const HeatingBody = (_props: LayerBodyProps) => {
  const { hass, model, config, t, history, range, now, actions } =
    useHistoryFrame();

  const language = model.language;
  const tempUnit = resolveTempUnit(hass, config);
  const zones = model.heating;
  const reserve = model.heatingReserve;
  const openCount = zones.filter((zone) =>
    isOpeningOn(hass, zone.opening ?? null),
  ).length;

  const source = chartSource(model);
  const sourceEntityId = source?.entityId;

  useRangeEnsure([sourceEntityId]);

  const nowDate = now();
  const values = sourceEntityId
    ? clipSeries(
        history.series(sourceEntityId, {
          start: range.start,
          end: range.end,
          buckets: 96,
          fill: "hold",
        }),
        96,
        range,
        nowDate,
      )
    : [];
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const chartState = chartStateFor(
    hasData,
    rangeStatusFor(history, sourceEntityId, range),
  );
  const line = hasData ? sparkPath(values, 560, CHART_HEIGHT, 2) : "";
  const area = hasData ? areaPath(values, 560, CHART_HEIGHT, 2) : "";
  const strip = heatingStrip(hass, zones, reserve);
  const limits = heatingLimits(model);

  const setTemperature = (entityId: string, next: number): void => {
    actions.callService(
      "climate",
      "set_temperature",
      { temperature: next },
      { entity_id: entityId },
    );
  };

  const setLimit = (entityId: string, next: number): void => {
    actions.callService(
      "input_number",
      "set_value",
      { value: next },
      { entity_id: entityId },
    );
  };

  const toggleZone = (zone: HeatingModel): void => {
    const entityId = zone.entity.entityId;
    const mode = liveState(hass, zone.entity);
    actions.callService(
      "climate",
      "set_hvac_mode",
      { hvac_mode: mode === "off" ? "heat" : "off" },
      { entity_id: entityId },
    );
  };

  return (
    <div
      data-react-layer
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      <SheetHeader
        kicker={t("sheet.kickerHeating")}
        title={t("sheet.titleHeating")}
        sum={t("heating.summary", {
          zones: zones.length,
          open: openCount,
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <HeatingZones
          zones={zones}
          strip={strip}
          hass={hass}
          language={language}
          unit={tempUnit}
          t={t}
          onSetpoint={setTemperature}
          onToggle={toggleZone}
        />
        <HeatingReserve
          reserve={reserve}
          hass={hass}
          language={language}
          unit={tempUnit}
          t={t}
          onSetpoint={setTemperature}
        />
        <HeatingLimits
          limits={limits}
          hass={hass}
          language={language}
          unit={tempUnit}
          t={t}
          onChange={setLimit}
        />
        <HeatingChart
          label={t("chart.period", {
            label: t("room.temperature"),
            period: rangePeriodLabel(range, t, language, nowDate),
          })}
          title={source?.label ?? t("room.temperature")}
          values={values}
          hasData={hasData}
          state={chartState}
          line={line}
          area={area}
          unit={tempUnit}
          start={range.start}
          end={range.end}
          emptyLabel={t("empty.chart")}
          loadingLabel={t("empty.loading")}
          unavailableLabel={t("empty.unavailable")}
        />
        <div className={c("note")}>
          {t("heating.footer", {
            zones: zones.length,
            reserve: reserve.length,
          })}
        </div>
      </div>
    </div>
  );
};
