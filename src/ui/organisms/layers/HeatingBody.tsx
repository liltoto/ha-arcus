import { useEffect, useId } from "react";
import { formatNumber } from "../../../format";
import { areaPath, sparkPath } from "../../../render/charts";
import type {
  ArcusConfig,
  ArcusHass,
  EntityRef,
  HeatingModel,
  HeatingReserveModel,
  HomeModel,
} from "../../../types";
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
import { ChartBox } from "../../molecules/ChartBox";
import { SheetHeader } from "../../molecules/SheetHeader";
import { Stepper } from "../../molecules/Stepper";
import { ZoneStrip } from "../../molecules/ZoneStrip";
import type { LayerBodyProps } from "../../pages/layerRegistry";

interface HeatingLimits {
  standard?: EntityRef;
  reduced?: EntityRef;
}

interface ChartSource {
  entityId: string;
  roomId: string;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 120;

function languageOf(model: HomeModel, config: ArcusConfig): "da" | "en" {
  return model.language === "en" || config.language === "en" ? "en" : "da";
}

function numberFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function temperature(value: number | null, language: "da" | "en"): string {
  return value === null ? "–" : `${formatNumber(value, 1, language)}°`;
}

function liveState(hass: ArcusHass, entity: EntityRef): string | undefined {
  return hass.states?.[entity.entityId]?.state ?? entity.state;
}

function liveAttributes(
  hass: ArcusHass,
  entity: EntityRef,
): Record<string, unknown> {
  return hass.states?.[entity.entityId]?.attributes ?? entity.attributes ?? {};
}

function isOpeningOn(hass: ArcusHass, opening: EntityRef | null): boolean {
  if (!opening) return false;
  const state = liveState(hass, opening);
  return state === "on" || state === "open";
}

function refNumber(hass: ArcusHass, entity: EntityRef): number | null {
  return (
    numberFrom(hass.states?.[entity.entityId]?.state) ??
    numberFrom(entity.state)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * The heating sheet's temperature history. The climate entity itself reports
 * an hvac mode rather than a number, so the chart follows the room temperature
 * sensor of the first zone (the same sensor the card already loads for the
 * home view).
 */
function chartSource(model: HomeModel): ChartSource | null {
  for (const zone of model.heating) {
    const room = zone.areaId
      ? model.rooms.find(
          (candidate) =>
            candidate.id === zone.areaId || candidate.areaId === zone.areaId,
        )
      : undefined;
    if (room?.temp?.entityId) {
      return {
        entityId: room.temp.entityId,
        roomId: room.id,
        label: room.name,
      };
    }
  }

  const room = model.rooms.find((candidate) => candidate.temp?.entityId);
  if (room?.temp?.entityId) {
    return { entityId: room.temp.entityId, roomId: room.id, label: room.name };
  }
  return null;
}

function encodeValues(values: Array<number | null>): string {
  return values
    .map((value) =>
      value === null || !Number.isFinite(value)
        ? ""
        : String(Math.round(value * 10000) / 10000),
    )
    .join(";");
}

interface SetpointProps {
  entityId: string;
  value: number | null;
  min: number;
  max: number;
  label: string;
  language: "da" | "en";
  dataAct: string;
  onChange: (value: number) => void;
}

/** One setpoint stepper carrying the legacy temp-step/input-step hooks. */
function Setpoint({
  entityId,
  value,
  min,
  max,
  label,
  language,
  dataAct,
  onChange,
}: SetpointProps) {
  if (value === null) return <span className="row-val">–</span>;
  return (
    <span
      data-act={dataAct}
      data-entity={entityId}
      data-step={0.5}
      style={{ display: "contents" }}
    >
      <Stepper
        value={value}
        min={min}
        max={max}
        step={0.5}
        unit="°"
        label={label}
        formatValue={(next) => formatNumber(next, 1, language)}
        onChange={onChange}
      />
    </span>
  );
}

/** Underfloor heating: the discovered climate zones plus reserve channels. */
export function HeatingBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow();
  const actions = useActions();
  const gradientId = `heat-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const language = languageOf(model, config);
  const zones = model.heating;
  const reserve = model.heatingReserve;
  const openCount = zones.filter((zone) =>
    isOpeningOn(hass, zone.opening ?? null),
  ).length;

  const source = chartSource(model);
  const sourceEntityId = source?.entityId;
  const values = sourceEntityId ? history.series(sourceEntityId) : [];
  const hasData = values.some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const end = now().getTime();
  const start = end - DAY_MS;
  const line = hasData ? sparkPath(values, 560, CHART_HEIGHT, 2) : "";
  const area = hasData ? areaPath(values, 560, CHART_HEIGHT, 2) : "";

  useEffect(() => {
    if (!sourceEntityId) return;
    void history.ensure([sourceEntityId], 24);
  }, [history, sourceEntityId]);

  const setTemperature = (entityId: string, next: number): void => {
    actions.callService(
      "climate",
      "set_temperature",
      { temperature: next },
      { entity_id: entityId },
    );
  };

  const setLimit = (entityId: string, next: number): void => {
    actions.callService(
      "input_number",
      "set_value",
      { value: next },
      { entity_id: entityId },
    );
  };

  const toggleZone = (zone: HeatingModel): void => {
    const entityId = zone.entity.entityId;
    const mode = liveState(hass, zone.entity);
    actions.callService(
      "climate",
      "set_hvac_mode",
      { hvac_mode: mode === "off" ? "heat" : "off" },
      { entity_id: entityId },
    );
  };

  const zoneRow = (zone: HeatingModel) => {
    const entityId = zone.entity.entityId;
    const attributes = liveAttributes(hass, zone.entity);
    const current = numberFrom(attributes.current_temperature);
    const target = numberFrom(attributes.temperature);
    const min = numberFrom(attributes.min_temp) ?? 5;
    const max = numberFrom(attributes.max_temp) ?? 35;
    const on = liveState(hass, zone.entity) !== "off";
    const opening = isOpeningOn(hass, zone.opening ?? null);

    return (
      <div className="row" key={entityId}>
        <div className="row-main">
          <div className="row-name">
            {zone.name}
            {opening ? (
              <span
                className="status-line"
                style={{ display: "inline-flex", marginLeft: 6 }}
              >
                <i className="dot warn" />
              </span>
            ) : null}
          </div>
          <div className="row-sub">
            {t("room.heatingNow", {
              temp: temperature(current, language),
            })}{" "}
            ·{" "}
            {attributes.hvac_action === "heating"
              ? t("room.heatingActive")
              : t("room.heatingHolding")}
            {opening ? ` · ${t("heating.windowOpen")}` : ""}
          </div>
        </div>
        <Setpoint
          entityId={entityId}
          value={target}
          min={min}
          max={max}
          label={zone.name}
          language={language}
          dataAct="temp-step"
          onChange={(next) => setTemperature(entityId, next)}
        />
        <button
          type="button"
          className={`toggle${on ? " on" : ""}`}
          data-act="hvac-toggle"
          data-entity={entityId}
          data-on={entityId}
          aria-label={`${t("common.toggle")} ${zone.name}`}
          aria-pressed={on}
          onClick={() => toggleZone(zone)}
        />
      </div>
    );
  };

  const reserveRow = (zone: HeatingReserveModel) => {
    const entityId = zone.entity.entityId;
    const attributes = liveAttributes(hass, zone.entity);
    const current = numberFrom(attributes.current_temperature);
    const target = numberFrom(attributes.temperature);
    const min = numberFrom(attributes.min_temp) ?? 5;
    const max = numberFrom(attributes.max_temp) ?? 35;

    return (
      <div className="row" key={entityId}>
        <div className="row-main">
          <div className="row-name">{zone.name}</div>
          <div className="row-sub">
            {t("room.heatingNow", {
              temp: temperature(current, language),
            })}
          </div>
        </div>
        <Setpoint
          entityId={entityId}
          value={target}
          min={min}
          max={max}
          label={zone.name}
          language={language}
          dataAct="temp-step"
          onChange={(next) => setTemperature(entityId, next)}
        />
      </div>
    );
  };

  const limits = (model as HomeModel & { heatingLimits?: HeatingLimits })
    .heatingLimits;
  const limitRow = (entity: EntityRef, label: string, sub: string) => {
    const attributes = liveAttributes(hass, entity);
    const value = refNumber(hass, entity);
    const min = numberFrom(attributes.min) ?? 5;
    const max = numberFrom(attributes.max) ?? 35;
    return (
      <div className="row" key={entity.entityId}>
        <div className="row-main">
          <div className="row-name">{label}</div>
          <div className="row-sub">{sub}</div>
        </div>
        <Setpoint
          entityId={entity.entityId}
          value={value}
          min={min}
          max={max}
          label={label}
          language={language}
          dataAct="input-step"
          onChange={(next) => setLimit(entity.entityId, next)}
        />
      </div>
    );
  };

  const stripValues = [...zones, ...reserve].map((zone) => {
    const attributes = liveAttributes(hass, zone.entity);
    const current = numberFrom(attributes.current_temperature) ?? 21;
    return clamp(40 + (current - 19) * 14, 20, 96);
  });
  const stripWarns = [...zones, ...reserve].map((zone) => {
    const attributes = liveAttributes(hass, zone.entity);
    const current = numberFrom(attributes.current_temperature);
    const target = numberFrom(attributes.temperature);
    return current !== null && target !== null && current < target - 0.5;
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
        kicker={t("sheet.kickerHeating")}
        title={t("sheet.titleHeating")}
        sum={t("heating.summary", {
          zones: zones.length,
          open: openCount,
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className="sheet-scroll">
        <div className="block">
          <div className="block-head">
            <div className="block-label">{t("heating.zones")}</div>
            <div style={{ width: 120, height: 26 }}>
              <ZoneStrip values={stripValues} warns={stripWarns} />
            </div>
          </div>
          <div className="list">
            {zones.length ? (
              zones.map(zoneRow)
            ) : (
              <EmptyState icon="heat" title={t("empty.dataYet")} />
            )}
          </div>
        </div>

        {reserve.length ? (
          <div className="block">
            <div className="block-label">{t("heating.reserve")}</div>
            <div className="list">{reserve.map(reserveRow)}</div>
          </div>
        ) : null}

        {limits && (limits.standard || limits.reduced) ? (
          <div className="block">
            <div className="block-label">{t("heating.limits")}</div>
            <div className="list">
              {limits.standard
                ? limitRow(
                    limits.standard,
                    t("heating.standard"),
                    t("heating.standardSub"),
                  )
                : null}
              {limits.reduced
                ? limitRow(
                    limits.reduced,
                    t("heating.reduced"),
                    t("heating.reducedSub"),
                  )
                : null}
            </div>
          </div>
        ) : null}

        <div className="block">
          <div className="block-label">
            {t("room.chart24", { label: t("room.temperature") })}
          </div>
          <ChartBox
            title={source?.label ?? t("room.temperature")}
            noData={!hasData}
            emptyLabel={t("empty.chart")}
          >
            <svg
              viewBox={`0 0 560 ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              data-graph="line"
              data-gv={hasData ? encodeValues(values) : undefined}
              data-gu="°C"
              data-gd="1"
              data-gt0={String(start)}
              data-gt1={String(end)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--amber)" stopOpacity=".26" />
                  <stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((part) => (
                <line
                  key={part}
                  x1="0"
                  y1={CHART_HEIGHT * part}
                  x2="560"
                  y2={CHART_HEIGHT * part}
                  stroke="var(--line)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path fill={`url(#${gradientId})`} d={area} />
              <path
                fill="none"
                stroke="var(--amber)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                d={line}
              />
            </svg>
          </ChartBox>
        </div>

        <div className="note">
          {t("heating.footer", {
            zones: zones.length,
            reserve: reserve.length,
          })}
        </div>
      </div>
    </div>
  );
}
