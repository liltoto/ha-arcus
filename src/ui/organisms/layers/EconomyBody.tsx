import { useId, useLayoutEffect, useRef } from "react";
import type { HistoryCache } from "../../../data/history";
import { formatNumber } from "../../../format";
import { areaPath, sparkPath } from "../../../render/charts";
import { applyGraph, type GraphInput } from "../../../render/graph";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Translator,
} from "../../../types";
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
import { ChartBox } from "../../molecules/ChartBox";
import { ListRow } from "../../molecules/ListRow";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";

interface ChartSeries {
  values: Array<number | null>;
  color: string;
  label?: string;
  unit?: string;
  decimals?: number;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 150;

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

interface BondChartProps {
  series: ChartSeries[];
  t: Translator;
  nowMs: number;
}

/**
 * The 30-day bond chart. The `data-g*` attributes land on the `.chart-box`
 * shell so the card's existing hover readout keeps working.
 */
function BondChart({ series, t, nowMs }: BondChartProps) {
  const gradientId = `economy-chart-${useId().replaceAll(":", "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const hasData = series.some((entry) =>
    entry.values.some(
      (value) => typeof value === "number" && Number.isFinite(value),
    ),
  );

  const first = series[0];
  const area = first
    ? areaPath(first.values, CHART_WIDTH, CHART_HEIGHT, 2, null)
    : "";

  const graph: GraphInput = {
    start: nowMs - 30 * 86_400_000,
    end: nowMs,
    unit: "",
    decimals: 2,
    series: series.map((entry) => ({
      label: entry.label,
      color: entry.color,
      values: entry.values,
      unit: entry.unit,
      decimals: entry.decimals,
    })),
  };

  useLayoutEffect(() => {
    const box =
      svgRef.current?.closest(".chart-box") ??
      svgRef.current?.parentElement ??
      null;
    if (!box) return;
    applyGraph(box, hasData ? graph : null);
  });

  return (
    <ChartBox noData={!hasData} emptyLabel={t("empty.chart")}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor={first?.color ?? "var(--accent)"}
              stopOpacity=".26"
            />
            <stop
              offset="1"
              stopColor={first?.color ?? "var(--accent)"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((part) => (
          <line
            key={part}
            x1="0"
            y1={CHART_HEIGHT * part}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT * part}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path fill={`url(#${gradientId})`} d={area} />
        {series.map((entry) => (
          <path
            key={entry.label ?? entry.color}
            fill="none"
            stroke={entry.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            d={sparkPath(entry.values, CHART_WIDTH, CHART_HEIGHT, 2, null)}
          />
        ))}
      </svg>
    </ChartBox>
  );
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
          <BondChart
            t={t}
            nowMs={nowMs}
            series={[
              {
                values: bondSeries,
                color: "var(--brass)",
                label: t("economy.price"),
              },
            ]}
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
