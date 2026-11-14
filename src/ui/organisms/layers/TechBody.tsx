import { useId, useLayoutEffect, useRef, type CSSProperties } from "react";
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

function seriesOf(
  history: HistoryCache,
  entityId: string | undefined,
): Array<number | null> {
  if (!entityId) return [];
  return typeof history.series === "function" ? history.series(entityId) : [];
}

interface PulseChartProps {
  series: ChartSeries[];
  t: Translator;
  nowMs: number;
}

/**
 * The 6-hour network pulse. The plot is drawn from the history cache and the
 * `data-g*` attributes are applied to the surrounding `.chart-box` so the
 * card's existing hover readout keeps working.
 */
function PulseChart({ series, t, nowMs }: PulseChartProps) {
  const gradientId = `tech-chart-${useId().replaceAll(":", "")}`;
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
    start: nowMs - 86_400_000,
    end: nowMs,
    unit: "ms",
    decimals: 1,
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
 * Tech: router/Google/Cloudflare latency, packet loss, jitter and the
 * inverter/datalogger details, ported from `views/layers/tech.ts`. The 6-hour
 * pulse is rendered from the history cache rather than left for the card to
 * fill in later.
 */
export function TechBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow();
  const actions = useActions();

  const language = languageOf(model, config, hass);
  const fmt = (value: number | null | undefined, digits = 1) =>
    formatNumber(value, digits, language);
  const hoursUnit = language === "da" ? "t" : "h";

  const tech = model.tech;
  const router = tech?.router ?? null;
  const google = tech?.google ?? null;
  const cloudflare = tech?.cloudflare ?? null;
  const loss = tech?.packetLoss ?? null;
  const loss7 = tech?.packetLoss7d ?? null;
  const jitter = tech?.jitter ?? null;
  const online = tech?.routerOnline;
  const status =
    online === true
      ? t("tech.responds")
      : online === false
        ? t("tech.notResponding")
        : "–";
  const statusLabel =
    online === true ? t("common.ok") : online === false ? t("tech.down") : "–";

  const routerSeries = seriesOf(history, config.network?.router);
  const googleSeries = seriesOf(history, config.network?.google);
  const cloudflareSeries = seriesOf(history, config.network?.cloudflare);
  const nowMs = now().getTime();

  if (!tech) {
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
          kicker={t("sheet.kickerTech")}
          title={t("sheet.titleTech")}
          sum="–"
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className="sheet-scroll">
          <EmptyState icon="network" title={t("empty.data")} />
        </div>
      </div>
    );
  }

  const uptime =
    tech.uptime === null || tech.uptime === undefined
      ? "–"
      : Math.round(tech.uptime / 3600);

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
        kicker={t("sheet.kickerTech")}
        title={t("sheet.titleTech")}
        sum={t("tech.summary", {
          router: fmt(router, 1),
          google: fmt(google, 1),
          loss: fmt(loss7, 2),
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className="sheet-scroll">
        <div className="readings">
          <Readout label={t("tech.router")} value={fmt(router, 1)} unit="ms" />
          <Readout label={t("tech.google")} value={fmt(google, 1)} unit="ms" />
          <Readout
            label={t("tech.cloudflare")}
            value={fmt(cloudflare, 1)}
            unit="ms"
          />
          <Readout label={t("tech.packetLoss")} value={fmt(loss, 1)} unit="%" />
        </div>
        <div className="block">
          <div className="block-head">
            <div className="block-label">{t("tech.pulse")}</div>
            <div className="legend">
              <span>
                <i style={{ "--c": "var(--sky)" } as CSSProperties} />
                {t("tech.router")}
              </span>
              <span>
                <i style={{ "--c": "var(--sage)" } as CSSProperties} />
                {t("tech.google")}
              </span>
              <span>
                <i style={{ "--c": "var(--plum)" } as CSSProperties} />
                {t("tech.cloudflare")}
              </span>
            </div>
          </div>
          <PulseChart
            t={t}
            nowMs={nowMs}
            series={[
              {
                values: routerSeries,
                color: "var(--sky)",
                label: t("tech.router"),
              },
              {
                values: googleSeries,
                color: "var(--sage)",
                label: t("tech.google"),
              },
              {
                values: cloudflareSeries,
                color: "var(--plum)",
                label: t("tech.cloudflare"),
              },
            ]}
          />
        </div>
        <div className="block">
          <div className="block-label">{t("tech.quality")}</div>
          <div className="list">
            <ListRow
              name={t("tech.router")}
              sub={status}
              icon="network"
              trailing={
                <span className="status-line">
                  <i className={`dot${online === false ? " warn" : ""}`} />
                  {statusLabel}
                </span>
              }
            />
            <ListRow
              name={t("tech.jitter")}
              sub={t("tech.router")}
              icon="wind"
              value={fmt(jitter, 2)}
              unit="ms"
            />
            <ListRow
              name={t("tech.packetLoss7d")}
              icon="alert"
              value={fmt(loss7, 2)}
              unit="%"
            />
            <ListRow
              name={t("tech.google")}
              sub="8.8.8.8"
              icon="network"
              value={fmt(google, 1)}
              unit="ms"
            />
            <ListRow
              name={t("tech.cloudflare")}
              sub="1.1.1.1"
              icon="network"
              value={fmt(cloudflare, 1)}
              unit="ms"
            />
          </div>
        </div>
        <div className="block">
          <div className="block-label">{t("tech.inverter")}</div>
          <div className="list">
            <ListRow
              name={t("tech.wifi")}
              icon="network"
              value={fmt(tech.wifiSignal, 0)}
              unit="dBm"
            />
            <ListRow
              name={t("tech.uptime")}
              icon="clock"
              trailing={
                <span className="row-val" style={{ fontSize: 13 }}>
                  {uptime}
                  <small>{hoursUnit}</small>
                </span>
              }
            />
            <ListRow
              name={t("tech.pulseTemp")}
              icon="thermometer"
              value={fmt(tech.temperature, 1)}
              unit="°C"
            />
            <ListRow
              name={t("tech.frequency")}
              icon="bolt"
              value={fmt(tech.frequency, 2)}
              unit="Hz"
            />
            <ListRow
              name={t("tech.model")}
              icon="info"
              trailing={
                <span className="row-val" style={{ fontSize: 11 }}>
                  {tech.inverterModel || "–"}
                </span>
              }
            />
            <ListRow
              name={t("tech.datalogger")}
              icon="info"
              trailing={
                <span className="row-val" style={{ fontSize: 11 }}>
                  {tech.dataloggerVersion || "–"}
                </span>
              }
            />
          </div>
        </div>
        <div className="note">{t("tech.footer")}</div>
      </div>
    </div>
  );
}
