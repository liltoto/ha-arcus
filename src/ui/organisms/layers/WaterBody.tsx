import { EmptyState } from "../../atoms/EmptyState";
import { SheetHeader } from "../../molecules/SheetHeader";
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
 * Water: the BWT softener, consumption, leak sensors, and the 24-hour flow
 * chart. Everything except the controls comes from `model.water`; the live
 * states are only needed for the holiday switch and the leak sensors.
 */
export const WaterBody = (_props: LayerBodyProps) => {
  const { hass, model, config, t, history, now, actions } = useHistoryFrame();
  const water = model.water;

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
  const flowId = config.water?.flow;
  const flowSeries = flowId ? history.series(flowId, { fill: "hold" }) : [];
  const end = now().getTime();
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

        <WaterFlow values={flowSeries} end={end} t={t} />

        {view.hasSoftener ? (
          <div className={c("note")}>{t("water.footer")}</div>
        ) : null}
      </div>
    </LayerShell>
  );
};
