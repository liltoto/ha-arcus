import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { HistoryCache } from "../../../data/history";
import type {
  ArcusConfig,
  ArcusHass,
  Language,
  SolarModel,
  Translator,
} from "../../../types";
import type { ArcusActions } from "../../types";
import type { LayerBodyProps } from "../../pages/layerRegistry";
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
import { EmptyState } from "../../atoms/EmptyState";
import { Icon } from "../../atoms/Icon";
import { Readout } from "../../molecules/Readout";
import { SegmentedTabs } from "../../molecules/SegmentedTabs";
import { SheetHeader } from "../../molecules/SheetHeader";
import { Stepper } from "../../molecules/Stepper";
import { BatteryRing } from "./solar/BatteryRing";
import { DayBars } from "./solar/DayBars";
import { EnergyFlow } from "./solar/EnergyFlow";
import { SolarArc } from "./solar/SolarArc";
import { SolarChart } from "./solar/SolarChart";
import {
  DAY_MS,
  dailyProductionDays,
  ensureHistory,
  entityKey,
  forecast48Values,
  fmt,
  historySeries,
  installedAtValue,
  languageOf,
  normalizeSub,
  pointsOnDate,
  solarHasData,
  solarNumber,
  sumDelta,
  todayForecastValues,
  windowKey,
} from "./solar/helpers";

interface SolarContext {
  solar: SolarModel;
  config: ArcusConfig;
  hass: ArcusHass;
  history: HistoryCache;
  t: Translator;
  language: Language;
  now: Date;
  actions: ArcusActions;
}

function MiniStat({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
}) {
  return (
    <div className="mini-stat">
      <div className="k">{label}</div>
      <div className="v">
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      {sub ? <div className="row-sub">{sub}</div> : null}
    </div>
  );
}

function Legend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span key={`${item.color}:${item.label}`}>
          <i style={{ "--c": item.color } as CSSProperties} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function entityBounds(
  hass: ArcusHass,
  entityId: string | undefined,
  fallbackMin: number,
  fallbackMax: number,
): { min: number; max: number } {
  const attributes = entityId ? hass.states?.[entityId]?.attributes : undefined;
  const min = Number(attributes?.min);
  const max = Number(attributes?.max);
  return {
    min: Number.isFinite(min) ? min : fallbackMin,
    max: Number.isFinite(max) ? max : fallbackMax,
  };
}

interface ControlRowProps {
  label: string;
  entityId?: string;
  step: number;
  value: number | null;
  min: number;
  max: number;
  digits: number;
  language: Language;
  onChange: (value: number) => void;
}

function ControlRow({
  label,
  entityId,
  step,
  value,
  min,
  max,
  digits,
  language,
  onChange,
}: ControlRowProps) {
  if (!entityId || value === null) {
    return (
      <div className="row">
        <span className="row-main">
          <div className="row-name">{label}</div>
        </span>
        <span className="row-val">{fmt(value, digits, language)}</span>
      </div>
    );
  }

  return (
    <div className="row">
      <span className="row-main">
        <div className="row-name">{label}</div>
      </span>
      <Stepper
        value={value}
        min={min}
        max={max}
        step={step}
        label={label}
        formatValue={(next) => fmt(next, digits, language)}
        onChange={onChange}
      />
    </div>
  );
}

function SolarOverview({ ctx }: { ctx: SolarContext }) {
  const { solar, config, history, t, language, now, actions } = ctx;
  const grid = solar.grid;
  const gridLabel =
    grid !== null && grid < 0 ? t("solar.gridBuy") : t("solar.gridSell");
  const heliosPath = config.solar?.heliosPath;

  return (
    <>
      <div className="readings">
        <Readout
          label={t("solar.battery")}
          value={fmt(solar.batterySoc, 0, language)}
          unit="%"
        />
        <Readout
          label={t("solar.today")}
          value={fmt(solar.today, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.productionNow")}
          value={fmt(solar.power, 0, language)}
          unit={t("energy.w")}
        />
        <Readout
          label={t("solar.load")}
          value={fmt(solar.load, 0, language)}
          unit={t("energy.w")}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.flow")}</div>
        <EnergyFlow solar={solar} language={language} t={t} />
      </div>
      <div className="block">
        <div className="block-head">
          <div className="block-label">{t("solar.power24")}</div>
          <Legend
            items={[
              { color: "var(--amber)", label: t("solar.legendSolar") },
              { color: "var(--sky)", label: t("solar.legendHouse") },
              { color: "var(--sage)", label: t("solar.legendBattery") },
              { color: "var(--muted)", label: t("solar.legendGrid") },
            ]}
          />
        </div>
        <SolarChart
          chart="solar-24h"
          height={150}
          now={now}
          empty={t("empty.chart")}
          shared
          series={[
            {
              key: "solarForecast",
              values: todayForecastValues(solar, now),
              color: "var(--amber)",
              label: t("solar.legendSolar"),
            },
            {
              key: windowKey(config.solar?.load),
              values: historySeries(history, config.solar?.load, 1),
              color: "var(--sky)",
              label: t("solar.legendHouse"),
            },
            {
              key: windowKey(config.solar?.batteryPower),
              values: historySeries(history, config.solar?.batteryPower, 1),
              color: "var(--sage)",
              label: t("solar.legendBattery"),
            },
            {
              key: windowKey(config.solar?.grid),
              values: historySeries(history, config.solar?.grid, 1),
              color: "var(--muted)",
              label: t("solar.legendGrid"),
            },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.gridPhases")}</div>
        <div className="readings">
          <Readout label="L1" value={fmt(solar.gridL1, 1, language)} unit="A" />
          <Readout label="L2" value={fmt(solar.gridL2, 1, language)} unit="A" />
          <Readout label="L3" value={fmt(solar.gridL3, 1, language)} unit="A" />
          <Readout
            label={gridLabel}
            value={fmt(grid === null ? null : Math.abs(grid), 0, language)}
            unit={t("energy.w")}
          />
        </div>
        <SolarChart
          chart="solar-grid-24h"
          height={110}
          now={now}
          empty={t("empty.chart")}
          shared
          unit="A"
          decimals={1}
          series={[
            {
              key: windowKey(config.solar?.gridL1),
              values: historySeries(history, config.solar?.gridL1, 1),
              color: "var(--sky)",
              label: "L1",
            },
            {
              key: windowKey(config.solar?.gridL2),
              values: historySeries(history, config.solar?.gridL2, 1),
              color: "var(--brass)",
              label: "L2",
            },
            {
              key: windowKey(config.solar?.gridL3),
              values: historySeries(history, config.solar?.gridL3, 1),
              color: "var(--plum)",
              label: "L3",
            },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.mppt")}</div>
        <div className="readings">
          <Readout
            label={t("solar.mppt3")}
            value={fmt(solar.pv3, 0, language)}
            unit={t("energy.w")}
          />
          <Readout
            label={t("solar.mppt4")}
            value={fmt(solar.pv4, 0, language)}
            unit={t("energy.w")}
          />
          <Readout
            label={t("solar.voltage3")}
            value={fmt(solar.pv3Voltage, 1, language)}
            unit="V"
          />
          <Readout
            label={t("solar.voltage4")}
            value={fmt(solar.pv4Voltage, 1, language)}
            unit="V"
          />
        </div>
        <div className="block-note">
          {t("solar.mpptNote", {
            i3: fmt(solar.pv3Current, 1, language),
            i4: fmt(solar.pv4Current, 1, language),
          })}
        </div>
      </div>
      <div className="btn-row">
        {heliosPath ? (
          <button
            type="button"
            className="btn"
            data-act="helios"
            onClick={() =>
              actions.performAction({
                action: "navigate",
                navigation_path: heliosPath,
              })
            }
          >
            <Icon name="solar" /> {t("solar.helios")}
          </button>
        ) : null}
        <button
          type="button"
          className="btn small"
          data-nav="sol/produktion"
          onClick={() => actions.navigate("sol/produktion")}
        >
          {t("sheet.tabProduction")}
        </button>
        <button
          type="button"
          className="btn small"
          data-nav="sol/batteri"
          onClick={() => actions.navigate("sol/batteri")}
        >
          {t("sheet.tabBattery")}
        </button>
        <button
          type="button"
          className="btn small"
          data-nav="sol/prognose"
          onClick={() => actions.navigate("sol/prognose")}
        >
          {t("sheet.tabForecast")}
        </button>
        <button
          type="button"
          className="btn small"
          data-nav="sol/afkast"
          onClick={() => actions.navigate("sol/afkast")}
        >
          {t("sheet.tabPayback")}
        </button>
      </div>
    </>
  );
}

function SolarProduction({ ctx }: { ctx: SolarContext }) {
  const { solar, config, history, t, language, now } = ctx;
  const days = dailyProductionDays(history, config.solar?.today, now, language);

  return (
    <>
      <div className="readings">
        <Readout
          label={t("solar.forecastToday")}
          value={fmt(solar.forecastToday, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.actualToday")}
          value={fmt(solar.today, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.thisMonth")}
          value={fmt(solar.month, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.thisYear")}
          value={fmt(solar.year, 1, language)}
          unit={t("energy.kwh")}
        />
      </div>
      <div className="block">
        <div className="block-head">
          <div className="block-label">{t("solar.productionVsForecast")}</div>
        </div>
        <SolarChart
          chart="solar-production-forecast"
          height={150}
          now={now}
          empty={t("empty.chart")}
          shared
          series={[
            {
              key: "solarForecast",
              values: todayForecastValues(solar, now),
              color: "var(--amber)",
              label: t("solar.forecastToday"),
            },
            {
              key: windowKey(config.solar?.power),
              values: historySeries(history, config.solar?.power, 1, 0),
              color: "var(--text)",
              label: t("solar.actual"),
            },
          ]}
        />
        <Legend
          items={[
            { color: "var(--amber)", label: t("solar.forecastToday") },
            { color: "var(--text)", label: t("solar.actual") },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.strings")}</div>
        <div className="readings">
          <Readout
            label={t("solar.mppt3")}
            value={fmt(solar.pv3, 0, language)}
            unit={t("energy.w")}
          />
          <Readout
            label={t("solar.mppt4")}
            value={fmt(solar.pv4, 0, language)}
            unit={t("energy.w")}
          />
          <Readout
            label={t("solar.voltage3")}
            value={fmt(solar.pv3Voltage, 1, language)}
            unit="V"
          />
          <Readout
            label={t("solar.voltage4")}
            value={fmt(solar.pv4Voltage, 1, language)}
            unit="V"
          />
        </div>
        <div className="block-note">
          {t("solar.mpptNote", {
            i3: fmt(solar.pv3Current, 1, language),
            i4: fmt(solar.pv4Current, 1, language),
          })}
        </div>
      </div>
      <div className="block">
        <div className="block-label">{t("solar.strings24")}</div>
        <SolarChart
          chart="solar-strings-24h"
          height={110}
          now={now}
          empty={t("empty.chart")}
          shared
          series={[
            {
              key: windowKey(config.solar?.pv3),
              values: historySeries(history, config.solar?.pv3, 1),
              color: "var(--brass)",
              label: t("solar.mppt3"),
            },
            {
              key: windowKey(config.solar?.pv4),
              values: historySeries(history, config.solar?.pv4, 1),
              color: "var(--sky)",
              label: t("solar.mppt4"),
            },
          ]}
        />
        <Legend
          items={[
            { color: "var(--brass)", label: t("solar.mppt3") },
            { color: "var(--sky)", label: t("solar.mppt4") },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.total")}</div>
        <div className="readings">
          <Readout
            label={t("solar.totalProduced")}
            value={fmt(solar.totalProduction, 0, language)}
            unit={t("energy.kwh")}
          />
          <Readout
            label={t("solar.thisMonth")}
            value={fmt(solar.month, 1, language)}
            unit={t("energy.kwh")}
          />
          <Readout
            label={t("solar.thisYear")}
            value={fmt(solar.year, 1, language)}
            unit={t("energy.kwh")}
          />
          <Readout
            label={t("solar.actualToday")}
            value={fmt(solar.today, 1, language)}
            unit={t("energy.kwh")}
          />
        </div>
      </div>
      <div className="block">
        <div className="block-label">{t("solar.dailyEnergy7")}</div>
        <DayBars days={days} empty={t("empty.dataYet")} language={language} />
      </div>
    </>
  );
}

function SolarBattery({ ctx }: { ctx: SolarContext }) {
  const { solar, config, hass, history, t, language, now, actions } = ctx;
  const minSoc = solarNumber(
    solar,
    hass,
    "batteryMinSoc",
    config.solar?.batteryMinSoc,
  );
  const maxSoc = solarNumber(
    solar,
    hass,
    "batteryMaxSoc",
    config.solar?.batteryMaxSoc,
  );
  const minEntity = config.solar?.batteryMinSoc;
  const maxEntity = config.solar?.batteryMaxSoc;
  const minBounds = entityBounds(hass, minEntity, 0, 100);
  const maxBounds = entityBounds(hass, maxEntity, 0, 100);

  const setNumber = (entityId: string | undefined, value: number): void => {
    if (!entityId) return;
    actions.callService(
      "number",
      "set_value",
      { value },
      { entity_id: entityId },
    );
  };

  return (
    <>
      <BatteryRing
        value={solar.batterySoc}
        label={t("solar.battery")}
        note={t("solar.batteryNote")}
        language={language}
      />
      <div className="readings">
        <Readout
          label={t("solar.temperature")}
          value={fmt(solar.batteryTemperature, 1, language)}
          unit="°C"
        />
        <Readout
          label={t("solar.voltage")}
          value={fmt(solar.batteryVoltage, 1, language)}
          unit="V"
        />
        <Readout
          label={t("solar.current")}
          value={fmt(solar.batteryCurrent, 1, language)}
          unit="A"
        />
        <Readout
          label={t("solar.inverter")}
          value={fmt(solar.inverterTemperature, 1, language)}
          unit="°C"
        />
      </div>
      <div className="readings" style={{ marginTop: 10 }}>
        <Readout
          label={t("solar.charge")}
          value={fmt(solar.batteryCharge, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.discharge")}
          value={fmt(solar.batteryDischarge, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.power")}
          value={fmt(solar.batteryPower, 0, language)}
          unit={t("energy.w")}
        />
        <Readout
          label={t("solar.soc")}
          value={fmt(solar.batterySoc, 0, language)}
          unit="%"
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.charge7")}</div>
        <SolarChart
          chart="solar-soc-7d"
          height={120}
          now={now}
          empty={t("empty.chart")}
          unit="%"
          decimals={0}
          start={now.getTime() - 7 * DAY_MS}
          end={now.getTime()}
          series={[
            {
              key: entityKey(config.solar?.batterySoc),
              values: historySeries(history, config.solar?.batterySoc, 7),
              color: "var(--sage)",
            },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.chargeDischarge7")}</div>
        <SolarChart
          chart="solar-charge-7d"
          height={110}
          now={now}
          empty={t("empty.chart")}
          shared
          start={now.getTime() - 7 * DAY_MS}
          end={now.getTime()}
          series={[
            {
              key: entityKey(config.solar?.batteryCharge),
              values: historySeries(history, config.solar?.batteryCharge, 7),
              color: "var(--sky)",
              label: t("solar.charge"),
            },
            {
              key: entityKey(config.solar?.batteryDischarge),
              values: historySeries(history, config.solar?.batteryDischarge, 7),
              color: "var(--brass)",
              label: t("solar.discharge"),
            },
          ]}
        />
        <Legend
          items={[
            { color: "var(--sky)", label: t("solar.charge") },
            { color: "var(--brass)", label: t("solar.discharge") },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.limits")}</div>
        <ControlRow
          label={t("solar.minSoc")}
          entityId={minEntity}
          step={1}
          value={minSoc}
          min={minBounds.min}
          max={minBounds.max}
          digits={0}
          language={language}
          onChange={(value) => setNumber(minEntity, value)}
        />
        <ControlRow
          label={t("solar.maxSoc")}
          entityId={maxEntity}
          step={1}
          value={maxSoc}
          min={maxBounds.min}
          max={maxBounds.max}
          digits={0}
          language={language}
          onChange={(value) => setNumber(maxEntity, value)}
        />
      </div>
      <div className="note">{t("solar.batteryFooter")}</div>
    </>
  );
}

function SolarForecast({ ctx }: { ctx: SolarContext }) {
  const { solar, t, language, now } = ctx;
  const diff =
    solar.forecastToday !== null &&
    solar.forecastToday > 0 &&
    solar.today !== null
      ? (solar.today / solar.forecastToday) * 100
      : null;

  return (
    <>
      <div className="readings">
        <Readout
          label={t("solar.today")}
          value={fmt(solar.forecastToday, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.forecastRemaining")}
          value={fmt(solar.forecastRemaining, 1, language)}
          unit={t("energy.kwh")}
        />
        <Readout
          label={t("solar.forecastNow")}
          value={fmt(solar.forecastNow, 0, language)}
          unit={t("energy.w")}
        />
        <Readout
          label={t("solar.forecastNextHour")}
          value={fmt(solar.forecastNextHour, 2, language)}
          unit={t("energy.kwh")}
        />
      </div>
      <div className="mini-grid" style={{ marginTop: 10 }}>
        <MiniStat
          label={t("solar.actualToday")}
          value={fmt(solar.today, 1, language)}
          unit={t("energy.kwh")}
          sub={`${t("solar.forecastToday")} ${fmt(
            solar.forecastToday,
            1,
            language,
          )}`}
        />
        <MiniStat
          label={t("solar.forecastVsActual")}
          value={fmt(diff, 0, language)}
          unit="%"
          sub={t("solar.forecastOfToday")}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.forecastToday")}</div>
        <SolarArc
          points={pointsOnDate(solar.forecastSeries, now)}
          now={now}
          empty={t("empty.chart")}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.forecast48")}</div>
        <SolarChart
          chart="solar-48h"
          height={150}
          now={now}
          empty={t("empty.chart")}
          start={now.getTime()}
          end={now.getTime() + 48 * 3_600_000}
          series={[
            {
              key: "solar48",
              values: forecast48Values(solar, now),
              color: "var(--amber)",
            },
          ]}
        />
        <div className="block-note">
          {t("solar.forecastTodayNote", {
            hour: fmt(solar.forecastCurrentHour, 1, language),
            next: fmt(solar.forecastNext24h, 0, language),
          })}
        </div>
      </div>
      <div className="block">
        <div className="block-label">{t("solar.comingDays")}</div>
        <div className="readings">
          <Readout
            label={t("common.tomorrow")}
            value={fmt(solar.forecastTomorrow, 1, language)}
            unit={t("energy.kwh")}
          />
          <Readout
            label={t("solar.in2Days")}
            value={fmt(solar.forecastD2, 1, language)}
            unit={t("energy.kwh")}
          />
          <Readout
            label={t("solar.in3Days")}
            value={fmt(solar.forecastD3, 1, language)}
            unit={t("energy.kwh")}
          />
          <Readout
            label={t("common.today")}
            value={fmt(solar.forecastToday, 1, language)}
            unit={t("energy.kwh")}
          />
        </div>
      </div>
    </>
  );
}

function SolarPayback({ ctx }: { ctx: SolarContext }) {
  const { solar, config, hass, history, t, language, now, actions } = ctx;
  const investmentSolar = solarNumber(
    solar,
    hass,
    "investmentSolar",
    config.solar?.investmentSolar,
  );
  const investmentBattery = solarNumber(
    solar,
    hass,
    "investmentBattery",
    config.solar?.investmentBattery,
  );
  const investment =
    investmentSolar !== null || investmentBattery !== null
      ? (investmentSolar ?? 0) + (investmentBattery ?? 0)
      : null;
  const total = solar.savingsTotal;
  const left =
    investment !== null && typeof total === "number"
      ? Math.max(0, investment - total)
      : null;
  const rate = solar.savingsRate;
  const today = sumDelta(history, config.solar?.savingsTotal, 1, now);
  const month = sumDelta(history, config.solar?.savingsTotal, 30, now);
  const year = sumDelta(history, config.solar?.savingsTotal, 365, now);
  const date =
    left !== null && typeof rate === "number" && rate > 0
      ? new Date(now.getTime() + (left / (rate * 24)) * DAY_MS)
      : null;
  const dateLabel = date
    ? new Intl.DateTimeFormat(language === "da" ? "da-DK" : "en-GB", {
        month: "long",
        year: "numeric",
      }).format(date)
    : "–";

  const solarEntity = config.solar?.investmentSolar;
  const batteryEntity = config.solar?.investmentBattery;
  const solarBounds = entityBounds(hass, solarEntity, 0, 500_000);
  const batteryBounds = entityBounds(hass, batteryEntity, 0, 500_000);

  const setInvestment = (entityId: string | undefined, value: number): void => {
    if (!entityId) return;
    actions.callService(
      "input_number",
      "set_value",
      { value },
      { entity_id: entityId },
    );
  };

  return (
    <>
      <div className="block">
        <div className="big-read">
          {fmt(solar.paybackPercent, 1, language)}
          <small>{t("solar.paybackPercent", { value: "" }).trim()}</small>
        </div>
        <div className="block-note">
          {t("solar.paybackTotalNote", {
            total: fmt(total, 0, language),
            rate: fmt(rate, 2, language),
          })}
        </div>
      </div>
      <div className="readings">
        <Readout
          label={t("common.today")}
          value={fmt(today, 0, language)}
          unit={t("energy.kr")}
        />
        <Readout
          label={t("solar.thisMonth")}
          value={fmt(month, 0, language)}
          unit={t("energy.kr")}
        />
        <Readout
          label={t("solar.thisYear")}
          value={fmt(year, 0, language)}
          unit={t("energy.kr")}
        />
        <Readout
          label={t("solar.paybackLeft")}
          value={fmt(left, 0, language)}
          unit={t("energy.kr")}
        />
      </div>
      <div className="mini-grid" style={{ marginTop: 10 }}>
        <MiniStat
          label={t("sheet.titleSolar")}
          value={fmt(solar.savingsSolar, 0, language)}
          unit={t("energy.kr")}
          sub={t("solar.paybackSavedTotal")}
        />
        <MiniStat
          label={t("solar.battery")}
          value={fmt(solar.savingsBattery, 0, language)}
          unit={t("energy.kr")}
          sub={t("solar.paybackSavedTotal")}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.paybackWhen")}</div>
        <div className="big-read" style={{ fontSize: 40 }}>
          {dateLabel}
        </div>
        <div className="block-note">
          {t("solar.paybackNote", {
            rate: fmt(rate, 2, language),
            investment: fmt(investment, 0, language),
          })}
        </div>
      </div>
      <div className="block">
        <div className="block-label">{t("solar.savings30")}</div>
        <SolarChart
          chart="solar-savings-30d"
          height={110}
          now={now}
          empty={t("empty.chart")}
          unit="kr"
          decimals={0}
          start={now.getTime() - 30 * DAY_MS}
          end={now.getTime()}
          series={[
            {
              key: "savings30",
              values: historySeries(history, config.solar?.savingsTotal, 30),
              color: "var(--sage)",
            },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.savingsYear")}</div>
        <SolarChart
          chart="solar-savings-365d"
          height={110}
          now={now}
          empty={t("empty.chart")}
          unit="kr"
          decimals={0}
          start={now.getTime() - 365 * DAY_MS}
          end={now.getTime()}
          series={[
            {
              key: "savings365",
              values: historySeries(history, config.solar?.savingsTotal, 365),
              color: "var(--brass)",
            },
          ]}
        />
      </div>
      <div className="block">
        <div className="block-label">{t("solar.settings")}</div>
        <ControlRow
          label={t("solar.investmentSolar")}
          entityId={solarEntity}
          step={1000}
          value={investmentSolar}
          min={solarBounds.min}
          max={solarBounds.max}
          digits={0}
          language={language}
          onChange={(value) => setInvestment(solarEntity, value)}
        />
        <ControlRow
          label={t("solar.investmentBattery")}
          entityId={batteryEntity}
          step={1000}
          value={investmentBattery}
          min={batteryBounds.min}
          max={batteryBounds.max}
          digits={0}
          language={language}
          onChange={(value) => setInvestment(batteryEntity, value)}
        />
        <div className="row">
          <span className="row-main">
            <div className="row-name">{t("solar.installed")}</div>
          </span>
          <span className="row-val" style={{ fontSize: 13 }}>
            {installedAtValue(solar, hass, config, language)}
          </span>
        </div>
      </div>
      <div className="note">{t("solar.paybackFooter")}</div>
    </>
  );
}

function SolarTabBody({
  active,
  ctx,
}: {
  active: ReturnType<typeof normalizeSub>;
  ctx: SolarContext;
}): ReactNode {
  if (active === "produktion") return <SolarProduction ctx={ctx} />;
  if (active === "batteri") return <SolarBattery ctx={ctx} />;
  if (active === "prognose") return <SolarForecast ctx={ctx} />;
  if (active === "afkast") return <SolarPayback ctx={ctx} />;
  return <SolarOverview ctx={ctx} />;
}

/**
 * The solar sheet, ported from `views/layers/solar.ts`.
 *
 * Every tab body keeps the legacy class names and chart keys (`data-chart`,
 * `data-chart-line`, `data-graph`, `data-bars`) so the card's history redraw
 * and the hover readout keep working while the sheet runs on React.
 */
export function SolarBody({ route }: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow()();
  const actions = useActions();
  const language = languageOf(model, config, t);
  const solar = model.solar;
  const hasData = solarHasData(solar);
  const active = normalizeSub(route.sub);

  useEffect(() => {
    if (!hasData) return;
    ensureHistory(history, config.solar, active);
  }, [history, config.solar, active, hasData]);

  const summary =
    hasData && solar
      ? t("solar.summary", {
          soc: fmt(solar.batterySoc, 0, language),
          today: fmt(solar.today, 1, language),
          power: fmt(solar.power, 0, language),
        })
      : t("solar.empty");

  const tabs = [
    { key: "overblik", label: t("sheet.tabOverview") },
    { key: "produktion", label: t("sheet.tabProduction") },
    { key: "batteri", label: t("sheet.tabBattery") },
    { key: "prognose", label: t("sheet.tabForecast") },
    { key: "afkast", label: t("sheet.tabPayback") },
  ];

  const changeTab = (key: string): void => {
    actions.navigate(key === "overblik" ? "sol" : `sol/${key}`);
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
        kicker={t("sheet.kickerSolar")}
        title={t("sheet.titleSolar")}
        sum={summary}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      {hasData ? (
        <SegmentedTabs tabs={tabs} active={active} onChange={changeTab} />
      ) : null}
      <div className="sheet-scroll">
        {hasData && solar ? (
          <SolarTabBody
            active={active}
            ctx={{
              solar,
              config,
              hass,
              history,
              t,
              language,
              now,
              actions,
            }}
          />
        ) : (
          <EmptyState
            icon="solar"
            title={t("solar.empty")}
            hint={t("empty.dataYet")}
          />
        )}
      </div>
    </div>
  );
}
