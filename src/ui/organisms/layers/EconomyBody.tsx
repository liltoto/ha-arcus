import type { HistoryCache } from "../../../data/history";
import { formatNumber } from "../../../format";
import { EmptyState } from "../../atoms/EmptyState";
import {
  chartStateFor,
  rangeStatusFor,
  useRangeEnsure,
} from "../../hooks/useHistoryRange";
import { useHistoryFrame } from "../../hooks/useLayerFrame";
import { HistoryChart } from "../../molecules/HistoryChart";
import { ListRow } from "../../molecules/ListRow";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";

const DAY_MS = 86_400_000;

/** The bond chart never shortens below its original thirty-day window. */
const MIN_CHART_DAYS = 30;

const windowOf = (
  history: HistoryCache,
  entityId: string | undefined,
  days: number,
  end: number,
): Array<number | null> => {
  if (!entityId) return [];
  return typeof history.window === "function"
    ? history.window(entityId, days, { end, fill: "hold" })
    : [];
};

/**
 * Economy: the bond price, today's change, effective yield, duration and the
 * 30-day price chart from the history cache, ported from
 * `views/layers/economy.ts`. The chart rewinds to the selected window while
 * the readings stay live.
 */
export const EconomyBody = (_props: LayerBodyProps) => {
  const { model, config, history, range, t, now, actions } = useHistoryFrame();

  const language = model.language;
  const fmt = (value: number | null | undefined, digits = 2) =>
    formatNumber(value, digits, language);
  const signed = (value: number | null | undefined) =>
    value === null || value === undefined
      ? "–"
      : `${value >= 0 ? "+" : ""}${fmt(value, 2)}`;
  const yearsUnit = language === "da" ? "år" : "yr";

  const economy = model.economy;
  const value = economy?.value ?? null;
  const change = economy?.change ?? null;
  const yieldValue = economy?.yield ?? null;
  const duration = economy?.duration ?? null;
  const bondId = config.economy?.bond;

  // The bond chart keeps a thirty-day window even when the selected period is
  // shorter, so ask for the missing lookback behind the anchor.
  useRangeEnsure([bondId], Math.max(1, MIN_CHART_DAYS - range.days) * DAY_MS);

  if (!economy) {
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
          kicker={t("sheet.kickerEconomy")}
          title={t("sheet.titleEconomy")}
          sum="–"
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className={c("sheet-scroll")}>
          <EmptyState icon="chart" title={t("empty.data")} />
        </div>
      </div>
    );
  }

  const chartDays = Math.max(
    MIN_CHART_DAYS,
    Math.round((range.end - range.start) / DAY_MS),
  );
  // Live windows stop at now so the held series cannot paint the future.
  const chartEnd = range.live ? now().getTime() : range.end;
  const chartStart = chartEnd - chartDays * DAY_MS;
  const bondSeries = windowOf(history, bondId, chartDays, chartEnd);
  const bondHasData = bondSeries.some(
    (entry) => typeof entry === "number" && Number.isFinite(entry),
  );
  const bondState = chartStateFor(
    bondHasData,
    rangeStatusFor(history, bondId, range),
  );
  const chartTitle = t("chart.period", {
    label: t("economy.chart30"),
    period: t("range.days30"),
  });

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
        kicker={t("sheet.kickerEconomy")}
        title={t("sheet.titleEconomy")}
        sum={t("economy.summary", {
          price: fmt(value, 2),
          change: signed(change),
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <div className={c("block")}>
          <div className={c("big-read")}>
            {fmt(value, 2)}
            <small>{t("economy.price")}</small>
          </div>
          <div className={c("block-note")}>
            {signed(change)} % {t("common.today").toLocaleLowerCase()}
          </div>
        </div>
        <div className={c("readings")}>
          <Readout
            label={t("economy.change")}
            value={signed(change)}
            unit="%"
          />
          <Readout
            label={t("economy.effectiveYield")}
            value={fmt(yieldValue, 3)}
            unit="%"
          />
          <Readout
            label={t("economy.duration")}
            value={fmt(duration, 2)}
            unit={yearsUnit}
          />
          <Readout label={t("economy.price")} value={fmt(value, 2)} />
        </div>
        <div className={c("block")}>
          <div className={c("block-label")}>{chartTitle}</div>
          <HistoryChart
            series={[
              {
                values: bondSeries,
                color: "var(--brass)",
                label: t("economy.price"),
              },
            ]}
            t={t}
            start={chartStart}
            end={chartEnd}
            unit=""
            decimals={2}
            idPrefix="economy-chart"
            state={bondState}
          />
        </div>
        <div className={c("block")}>
          <div className={c("block-label")}>{t("economy.metrics")}</div>
          <div className={c("list")}>
            <ListRow
              name={t("economy.price")}
              sub={t("economy.latest")}
              icon="chart"
              value={fmt(value, 2)}
            />
            <ListRow
              name={t("economy.changeToday")}
              icon="arrow"
              value={signed(change)}
              unit="%"
            />
            <ListRow
              name={t("economy.effectiveYield")}
              icon="percent"
              value={fmt(yieldValue, 3)}
              unit="%"
            />
            <ListRow
              name={t("economy.duration")}
              icon="clock"
              value={fmt(duration, 2)}
              unit={yearsUnit}
            />
          </div>
        </div>
        <div className={c("note")}>{t("economy.footer")}</div>
      </div>
    </div>
  );
};
