import type { CSSProperties } from "react";
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

function seriesOf(
  history: HistoryCache,
  entityId: string | undefined,
): Array<number | null> {
  if (!entityId) return [];
  return typeof history.series === "function"
    ? history.series(entityId, { fill: "hold" })
    : [];
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
        <div className={c("sheet-scroll")}>
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
      <div className={c("sheet-scroll")}>
        <div className={c("readings")}>
          <Readout label={t("tech.router")} value={fmt(router, 1)} unit="ms" />
          <Readout label={t("tech.google")} value={fmt(google, 1)} unit="ms" />
          <Readout
            label={t("tech.cloudflare")}
            value={fmt(cloudflare, 1)}
            unit="ms"
          />
          <Readout label={t("tech.packetLoss")} value={fmt(loss, 1)} unit="%" />
        </div>
        <div className={c("block")}>
          <div className={c("block-head")}>
            <div className={c("block-label")}>{t("tech.pulse")}</div>
            <div className={c("legend")}>
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
          <HistoryChart
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
            t={t}
            nowMs={nowMs}
            windowMs={86_400_000}
            unit="ms"
            decimals={1}
            idPrefix="tech-chart"
          />
        </div>
        <div className={c("block")}>
          <div className={c("block-label")}>{t("tech.quality")}</div>
          <div className={c("list")}>
            <ListRow
              name={t("tech.router")}
              sub={status}
              icon="network"
              trailing={
                <span className={c("status-line")}>
                  <i className={c("dot", online === false && "warn")} />
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
        <div className={c("block")}>
          <div className={c("block-label")}>{t("tech.inverter")}</div>
          <div className={c("list")}>
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
                <span className={c("row-val")} style={{ fontSize: 13 }}>
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
                <span className={c("row-val")} style={{ fontSize: 11 }}>
                  {tech.inverterModel || "–"}
                </span>
              }
            />
            <ListRow
              name={t("tech.datalogger")}
              icon="info"
              trailing={
                <span className={c("row-val")} style={{ fontSize: 11 }}>
                  {tech.dataloggerVersion || "–"}
                </span>
              }
            />
          </div>
        </div>
        <div className={c("note")}>{t("tech.footer")}</div>
      </div>
    </div>
  );
}
