import type { HistoryCache } from "../../../../data/history";
import { formatNumber } from "../../../../format";
import { rangePeriodLabel, type ResolvedHistoryRange } from "../../../../range";
import type {
  ArcusHass,
  EnergyApplianceConfig,
  EnergyEvConfig,
  Language,
  Translator,
} from "../../../../types";
import {
  chartStateFor,
  rangeStatusFor,
  windowSeries,
} from "../../../hooks/useHistoryRange";
import { HistoryChart } from "../../../molecules/HistoryChart";
import { ListRow } from "../../../molecules/ListRow";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import { liveNumber, liveOn } from "./energy-view";

/** One device chart is a full day at quarter-hour resolution. */
const BUCKETS = 96;

interface ChartTitleInput {
  label: string;
  range: ResolvedHistoryRange;
  now: () => Date;
  t: Translator;
  language: Language;
}

/** `Fryser · I dag` / `Fryser · tor. 12. nov.` */
const chartTitle = ({
  label,
  range,
  now,
  t,
  language,
}: ChartTitleInput): string => {
  return t("chart.period", {
    label,
    period: rangePeriodLabel(range, t, language, now()),
  });
};

interface DeviceChartProps {
  title: string;
  entityId: string | undefined;
  color: string;
  history: HistoryCache;
  range: ResolvedHistoryRange;
  now: () => Date;
  t: Translator;
  unit: string;
  decimals: number;
  idPrefix: string;
}

/**
 * One device chart for the selected window. The live readouts above it stay
 * live; only the curve rewinds.
 */
const DeviceChart = ({
  title,
  entityId,
  color,
  history,
  range,
  now,
  t,
  unit,
  decimals,
  idPrefix,
}: DeviceChartProps) => {
  if (!entityId) return null;
  const values = windowSeries(history, entityId, range, now(), BUCKETS, "hold");
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{title}</div>
      <HistoryChart
        series={[{ values, color }]}
        t={t}
        start={range.start}
        end={range.end}
        unit={unit}
        decimals={decimals}
        idPrefix={idPrefix}
        state={chartStateFor(hasData, rangeStatusFor(history, entityId, range))}
      />
    </div>
  );
};

interface EnergyReadingProps {
  hass: ArcusHass;
  history: HistoryCache;
  range: ResolvedHistoryRange;
  now: () => Date;
  t: Translator;
  language: Language;
}

/** One optional EV block driven by `config.energy.ev`. */
const EvBlock = ({
  ev,
  hass,
  history,
  range,
  now,
  t,
  language,
}: EnergyReadingProps & { ev: EnergyEvConfig }) => {
  const plugged = liveOn(hass, ev.plugged, undefined);
  const value = (entityId: string, digits: number): string =>
    formatNumber(liveNumber(hass, history, entityId, null), digits, language);

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{ev.name || t("energy.tesla")}</div>
        <div className={c("block-label")}>
          <b>{plugged ? t("energy.plugged") : t("energy.unplugged")}</b>
        </div>
      </div>
      <div className={c("readings")}>
        {ev.power ? (
          <Readout
            label={t("energy.power")}
            value={value(ev.power, 0)}
            unit={t("energy.w")}
          />
        ) : null}
        {ev.session ? (
          <Readout
            label={t("energy.session")}
            value={value(ev.session, 1)}
            unit={t("energy.kwh")}
          />
        ) : null}
        {ev.total ? (
          <Readout
            label={t("energy.total")}
            value={value(ev.total, 0)}
            unit={t("energy.kwh")}
          />
        ) : null}
        {ev.soc ? (
          <Readout label={t("solar.soc")} value={value(ev.soc, 0)} unit="%" />
        ) : null}
      </div>
      <DeviceChart
        title={chartTitle({
          label: t("energy.power"),
          range,
          now,
          t,
          language,
        })}
        entityId={ev.power}
        color="var(--sky)"
        history={history}
        range={range}
        now={now}
        t={t}
        unit={t("energy.w")}
        decimals={0}
        idPrefix="energy-ev-chart"
      />
    </div>
  );
};

/** The optional standby and appliance list driven by `config.energy`. */
const AppliancesBlock = ({
  standby,
  appliances,
  hass,
  history,
  range,
  now,
  t,
  language,
}: EnergyReadingProps & {
  standby: string | undefined;
  appliances: EnergyApplianceConfig[];
}) => {
  const standbyValue = liveNumber(hass, history, standby, null);
  const value = (entityId: string): string =>
    formatNumber(liveNumber(hass, history, entityId, null), 0, language);

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("energy.appliances")}</div>
        {standby ? (
          <div className={c("block-label")}>
            <b>
              {t("energy.standbyKwh", {
                value: formatNumber(standbyValue, 1, language),
              })}
            </b>
          </div>
        ) : null}
      </div>
      <div className={c("list")}>
        {appliances.map((appliance, index) => (
          <ListRow
            key={`${appliance.entity}:${index}`}
            icon={appliance.icon || "bolt"}
            name={appliance.name}
            value={value(appliance.entity)}
            unit={t("energy.w")}
          />
        ))}
      </div>
      <DeviceChart
        title={chartTitle({
          label: t("energy.standby"),
          range,
          now,
          t,
          language,
        })}
        entityId={standby}
        color="var(--brass)"
        history={history}
        range={range}
        now={now}
        t={t}
        unit={t("energy.w")}
        decimals={0}
        idPrefix="energy-standby-chart"
      />
      {appliances.map((appliance, index) => (
        <DeviceChart
          key={`chart:${appliance.entity}:${index}`}
          title={chartTitle({
            label: appliance.name,
            range,
            now,
            t,
            language,
          })}
          entityId={appliance.entity}
          color="var(--sage)"
          history={history}
          range={range}
          now={now}
          t={t}
          unit={t("energy.w")}
          decimals={0}
          idPrefix="energy-appliance-chart"
        />
      ))}
    </div>
  );
};

interface EnergyDevicesProps extends EnergyReadingProps {
  ev: EnergyEvConfig | undefined;
  standby: string | undefined;
  appliances: EnergyApplianceConfig[];
}

/** The optional EV and appliance blocks below the price section. */
export const EnergyDevices = ({
  ev,
  standby,
  appliances,
  hass,
  history,
  range,
  now,
  t,
  language,
}: EnergyDevicesProps) => {
  return (
    <>
      {ev ? (
        <EvBlock
          ev={ev}
          hass={hass}
          history={history}
          range={range}
          now={now}
          t={t}
          language={language}
        />
      ) : null}
      {standby || appliances.length ? (
        <AppliancesBlock
          standby={standby}
          appliances={appliances}
          hass={hass}
          history={history}
          range={range}
          now={now}
          t={t}
          language={language}
        />
      ) : null}
    </>
  );
};
