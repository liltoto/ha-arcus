import type { HistoryCache } from "../../../data/history";
import { formatNumber } from "../../../format";
import type { ArcusConfig, ArcusHass, HomeModel } from "../../../types";
import { EmptyState } from "../../atoms/EmptyState";
import {
  useActions,
  useConfig,
  useHass,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useTranslator,
} from "../../hooks";
import { HistoryChart } from "../../molecules/HistoryChart";
import { ListRow } from "../../molecules/ListRow";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";

function languageOf(
  model: HomeModel,
  config: ArcusConfig,
  hass: ArcusHass,
): "da" | "en" {
  return model.language === "en" ||
    config.language === "en" ||
    hass.language === "en"
    ? "en"
    : "da";
}

function windowOf(
  history: HistoryCache,
  entityId: string | undefined,
  days: number,
): Array<number | null> {
  if (!entityId) return [];
  return typeof history.window === "function"
    ? history.window(entityId, days, { fill: "hold" })
    : [];
}

/**
 * Economy: the bond price, today's change, effective yield, duration and the
 * 30-day price chart from the history cache, ported from
 * `views/layers/economy.ts`.
 */
export function EconomyBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow();
  const actions = useActions();

  const language = languageOf(model, config, hass);
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
  const bondSeries = windowOf(history, bondId, 30);
  const nowMs = now().getTime();

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
          <div className={c("block-label")}>{t("economy.chart30")}</div>
          <HistoryChart
            series={[
              {
                values: bondSeries,
                color: "var(--brass)",
                label: t("economy.price"),
              },
            ]}
            t={t}
            nowMs={nowMs}
            windowMs={30 * 86_400_000}
            unit=""
            decimals={2}
            idPrefix="economy-chart"
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
}
