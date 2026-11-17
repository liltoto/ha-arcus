import { clipSeries, rangePeriodLabel } from "../../../range";
import { EmptyState } from "../../atoms/EmptyState";
import { SheetHeader } from "../../molecules/SheetHeader";
import {
  chartStateFor,
  rangeStatusFor,
  useRangeEnsure,
} from "../../hooks/useHistoryRange";
import { useHistoryFrame } from "../../hooks/useLayerFrame";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";
import { LayerShell } from "./misc/LayerShell";
import { WaterFlow } from "./water/WaterFlow";
import { WaterLeaks } from "./water/WaterLeaks";
import {
  WaterReadings,
  WaterSoftener,
  WaterToday,
} from "./water/WaterSoftener";
import { resolveWaterView } from "./water/water-view";

/**
 * Water: the BWT softener, consumption, leak sensors, and the flow chart for
 * the selected history window. Everything except the controls comes from
 * `model.water`; the live states are only needed for the holiday switch and
 * the leak sensors.
 */
export const WaterBody = (_props: LayerBodyProps) => {
  const { hass, model, config, t, history, range, now, actions } =
    useHistoryFrame();
  const water = model.water;
  const flowId = config.water?.flow;

  useRangeEnsure([flowId]);

  if (!water) {
    return (
      <LayerShell>
        <SheetHeader
          kicker={t("sheet.kickerWater")}
          title={t("sheet.titleWater")}
          sum="–"
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className={c("sheet-scroll")}>
          <EmptyState icon="drop" title={t("empty.data")} />
        </div>
      </LayerShell>
    );
  }

  const view = resolveWaterView(hass, model, config, water, t);
  const nowDate = now();
  const values = flowId
    ? history.series(flowId, {
        start: range.start,
        end: range.end,
        buckets: 96,
        fill: "hold",
      })
    : [];
  const flowSeries = clipSeries(values, 96, range, nowDate);
  const hasData = flowSeries.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const state = chartStateFor(hasData, rangeStatusFor(history, flowId, range));
  const flowLabel = t("chart.period", {
    label: t("water.flow"),
    period: rangePeriodLabel(range, t, model.language, nowDate),
  });
  const holidayId = view.holidayId;

  const toggleHoliday = (): void => {
    if (!holidayId) return;
    actions.callService(
      "input_boolean",
      "toggle",
      {},
      { entity_id: holidayId },
    );
  };

  return (
    <LayerShell>
      <SheetHeader
        kicker={t("sheet.kickerWater")}
        title={t("sheet.titleWater")}
        sum={view.summary}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <WaterToday view={view} t={t} />
        <WaterReadings view={view} t={t} />

        {view.hasSoftener ? (
          <WaterSoftener view={view} onToggleHoliday={toggleHoliday} t={t} />
        ) : null}

        <WaterLeaks view={view} t={t} />

        <WaterFlow
          values={flowSeries}
          label={flowLabel}
          start={range.start}
          end={range.end}
          state={state}
          t={t}
        />

        {view.hasSoftener ? (
          <div className={c("note")}>{t("water.footer")}</div>
        ) : null}
      </div>
    </LayerShell>
  );
};
