import { useId } from "react";
import { formatNumber } from "../../../format";
import { areaPath, sparkPath } from "../../../render/charts";
import { graphAttrs, type GraphInput } from "../../../render/graph";
import type { ArcusHass, Translator } from "../../../types";
import { EmptyState } from "../../atoms/EmptyState";
import { Icon } from "../../atoms/Icon";
import { ChartBox } from "../../molecules/ChartBox";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import { ToggleRow } from "../../molecules/ToggleRow";
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
import type { LayerBodyProps } from "../../pages/layerRegistry";

const CHART_HEIGHT = 110;
const CHART_WIDTH = 560;
const DAY_MS = 86_400_000;

/**
 * `graphAttrs` produces an HTML attribute string for the legacy string views.
 * React needs the same values as props, so decode the escaped entities that
 * `graphAttrs` adds when it serialises the series JSON.
 */
function graphProps(input: GraphInput): Record<string, string> {
  const props: Record<string, string> = {};
  for (const match of graphAttrs(input).matchAll(
    /data-([a-z0-9]+)="([^"]*)"/g,
  )) {
    props[`data-${match[1]}`] = match[2]
      .replaceAll("&quot;", '"')
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
  }
  return props;
}

function entityState(hass: ArcusHass, entityId: string): string | null {
  const state = hass.states[entityId]?.state;
  return typeof state === "string" ? state : null;
}

/** The live on/off state, with a numeric fallback for sensors without "on". */
function isOn(hass: ArcusHass, entityId: string, fallback = false): boolean {
  const state = entityState(hass, entityId);
  if (state === null) return fallback;
  if (
    state === "on" ||
    state === "open" ||
    state === "home" ||
    state === "playing" ||
    state === "heating" ||
    state === "heat"
  ) {
    return true;
  }
  if (state !== "") {
    const value = Number(state);
    if (Number.isFinite(value)) return value > 0;
  }
  return false;
}

function entityName(
  hass: ArcusHass,
  entityId: string,
  index: number,
  t: Translator,
): string {
  const friendly = hass.states[entityId]?.attributes?.friendly_name;
  if (typeof friendly === "string" && friendly.trim()) return friendly;
  if (index === 0) return t("water.kitchen");
  if (index === 1) return t("water.utility");
  return `${t("water.leak")} ${index + 1}`;
}

interface LeakRowProps {
  name: string;
  on: boolean;
  t: Translator;
}

function LeakRow({ name, on, t }: LeakRowProps) {
  return (
    <div className="row">
      <Icon name="drop" />
      <div className="row-main">
        <div className="row-name">{name}</div>
        <div className="row-sub">
          {on ? t("water.waterDetected") : t("water.noWater")}
        </div>
      </div>
      <span className="status-line">
        <i className={`dot${on ? " warn" : ""}`} />
        {on ? t("water.alarm") : t("common.ok")}
      </span>
    </div>
  );
}

/**
 * Water: the BWT softener, consumption, leak sensors, and the 24-hour flow
 * chart. Everything except the controls comes from `model.water`; the live
 * states are only needed for the holiday switch and the leak sensors.
 */
export function WaterBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow();
  const actions = useActions();
  const gradientId = `water-chart-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const water = model.water;

  if (!water) {
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
          kicker={t("sheet.kickerWater")}
          title={t("sheet.titleWater")}
          sum="–"
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className="sheet-scroll">
          <EmptyState icon="drop" title={t("empty.data")} />
        </div>
      </div>
    );
  }

  const language =
    model.language === "en" || config.language === "en" ? "en" : "da";
  const fmt = (value: number | null | undefined, digits = 1) =>
    formatNumber(value, digits, language);

  const day = water.day ?? null;
  const month = water.month ?? null;
  const total = water.total ?? null;
  const cost = water.cost ?? null;
  const flow = water.flow ?? null;
  const salt = water.salt ?? null;
  const saltDays = water.saltDays ?? null;
  const capacity = water.capacity ?? null;
  const state = water.state || "–";
  const holidayId = config.water?.holiday;
  const holidayOn = holidayId
    ? isOn(hass, holidayId, Boolean(water.holiday))
    : Boolean(water.holiday);

  const leakIds = config.security?.leaks ?? [];
  const leakBattery = model.security?.batteries?.find((battery) =>
    /klippbok|water|leak/i.test(battery.entityId),
  );

  const flowId = config.water?.flow;
  const flowSeries = flowId ? history.series(flowId) : [];
  const hasData = flowSeries.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const area = areaPath(flowSeries, CHART_WIDTH, CHART_HEIGHT, 2);
  const line = sparkPath(flowSeries, CHART_WIDTH, CHART_HEIGHT, 2);
  const end = now().getTime();
  const graph = hasData
    ? graphProps({
        start: end - DAY_MS,
        end,
        unit: "L/min",
        decimals: 1,
        series: [{ values: flowSeries, color: "var(--sky)" }],
      })
    : {};

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
        kicker={t("sheet.kickerWater")}
        title={t("sheet.titleWater")}
        sum={t("water.summary", {
          day: fmt(day, 1),
          state,
          salt: fmt(salt, 0),
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className="sheet-scroll">
        <div className="block">
          <div className="big-read">
            {fmt(day, 1)}
            <small>L {t("common.today").toLocaleLowerCase()}</small>
          </div>
          <div className="block-note">
            {month !== null || total !== null
              ? t("water.note", {
                  month: fmt(month, 0),
                  total: fmt(total === null ? null : total / 1000, 1),
                })
              : t("empty.data")}
          </div>
        </div>

        <div className="readings">
          <Readout
            label={t("water.thisMonth")}
            value={fmt(month, 0)}
            unit="L"
          />
          <Readout
            label={t("water.total")}
            value={fmt(total === null ? null : total / 1000, 1)}
            unit="m³"
          />
          <Readout label={t("water.cost")} value={fmt(cost, 0)} unit="kr" />
          <Readout
            label={t("water.flowNow")}
            value={fmt(flow, 2)}
            unit="m³/h"
          />
        </div>

        <div className="block">
          <div className="block-head">
            <div className="block-label">{t("water.bwt")}</div>
            <div className="block-label">
              <b>{state}</b>
            </div>
          </div>
          <div className="readings">
            <Readout label={t("water.salt")} value={fmt(salt, 0)} unit="%" />
            <Readout
              label={t("water.daysLeft")}
              value={fmt(saltDays, 0)}
              unit={t("water.days")}
            />
            <Readout
              label={t("water.capacity")}
              value={fmt(capacity, 0)}
              unit="L"
            />
            <Readout label={t("water.flow")} value={fmt(flow, 2)} unit="m³/h" />
          </div>
          {holidayId ? (
            <ToggleRow
              label={t("water.holiday")}
              sub={t("water.holidaySub")}
              isOn={holidayOn}
              onChange={toggleHoliday}
              dataAct="toggle-bool"
              dataEntity={holidayId}
            />
          ) : null}
        </div>

        <div className="block">
          <div className="block-head">
            <div className="block-label">{t("water.leak")}</div>
            <div className="block-label">
              <b>
                {model.security?.leak ? t("water.alarm") : t("water.allDry")}
              </b>
            </div>
          </div>
          {leakIds.length ? (
            leakIds.map((entityId, index) => (
              <LeakRow
                key={entityId}
                name={entityName(hass, entityId, index, t)}
                on={isOn(hass, entityId, Boolean(model.security?.leak))}
                t={t}
              />
            ))
          ) : (
            <div className="block-note">{t("empty.data")}</div>
          )}
          {leakBattery ? (
            <div className="row">
              <Icon name="battery" />
              <div className="row-main">
                <div className="row-name">{t("water.battery")}</div>
                <div className="row-sub">{t("water.leakBattery")}</div>
              </div>
              <span className="row-val">
                {leakBattery.level === null ? "–" : fmt(leakBattery.level, 0)}
                <small>%</small>
              </span>
            </div>
          ) : null}
        </div>

        <div className="block">
          <div className="block-label">{t("water.flow24")}</div>
          <ChartBox noData={!hasData} emptyLabel={t("empty.chart")}>
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              {...graph}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--sky)" stopOpacity=".26" />
                  <stop offset="1" stopColor="var(--sky)" stopOpacity="0" />
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
              <path
                fill="none"
                stroke="var(--sky)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                d={line}
              />
            </svg>
          </ChartBox>
        </div>

        <div className="note">{t("water.footer")}</div>
      </div>
    </div>
  );
}
