import { formatNumber, numberFrom } from "../../../format";
import type {
  ArcusHass,
  EntityRef,
  Translator,
  VentilationModel,
} from "../../../types";
import { EmptyState } from "../../atoms/EmptyState";
import { Icon } from "../../atoms/Icon";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import { Stepper } from "../../molecules/Stepper";
import {
  useActions,
  useConfig,
  useHass,
  useModel,
  useTranslator,
} from "../../hooks";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";

type SheetLanguage = "da" | "en";

const FILTER_OK = new Set([
  "ok",
  "nej",
  "neutral",
  "off",
  "unknown",
  "unavailable",
]);

function filterOk(filter: string | null | undefined): boolean {
  return !filter || FILTER_OK.has(filter.toLowerCase());
}

function filterLabel(t: Translator, filter: string | null | undefined): string {
  if (!filter) return "–";
  return filterOk(filter) ? t("ventilation.filterOk") : filter;
}

function countText(value: number | null | undefined, fallback = "–"): string {
  return value === null || value === undefined
    ? fallback
    : String(Math.round(value));
}

function temperatureText(
  value: number | null | undefined,
  language: SheetLanguage,
): string {
  return value === null || value === undefined
    ? "–"
    : `${formatNumber(value, 1, language)}°`;
}

/** Live number from hass, falling back to the ref snapshot on the model. */
function refNumber(
  hass: ArcusHass,
  ref: EntityRef | null | undefined,
): number | null {
  if (!ref) return null;
  const live = hass.states[ref.entityId]?.state;
  return numberFrom(live) ?? numberFrom(ref.state);
}

function optionsFor(hass: ArcusHass, entityId: string | undefined): string[] {
  if (!entityId) return [];
  const options = hass.states[entityId]?.attributes?.options;
  return Array.isArray(options) ? options.map(String) : [];
}

interface UserSelectProps {
  hass: ArcusHass;
  entityId: string | undefined;
  value: string | null | undefined;
  onSelect: (option: string) => void;
}

function UserSelect({ hass, entityId, value, onSelect }: UserSelectProps) {
  if (!entityId) return <span className={c("row-val")}>{value || "–"}</span>;
  const options = optionsFor(hass, entityId);
  const selected = value ?? hass.states[entityId]?.state ?? "";
  if (!options.length) {
    return <span className={c("row-val")}>{selected || "–"}</span>;
  }
  if (selected && !options.includes(selected)) options.push(selected);
  return (
    <select
      className={c("select")}
      data-select-entity={entityId}
      value={selected || options[0]}
      onChange={(event) => onSelect(event.currentTarget.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

interface AirflowProps {
  ventilation: VentilationModel;
  temperature: number | null;
  language: SheetLanguage;
  t: Translator;
}

/** The five-node Nilan airflow, kept as the same SVG as the legacy sheet. */
function Airflow({ ventilation, temperature, language, t }: AirflowProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("ventilation.airPath")}</div>
      <div className={c("flow-wrap air-flow")}>
        <svg viewBox="0 0 560 118" aria-hidden="true">
          <defs>
            <marker
              id="airar"
              markerWidth="7"
              markerHeight="7"
              refX="5.5"
              refY="3.5"
              orient="auto"
            >
              <path
                d="M0,0 L7,3.5 L0,7"
                fill="none"
                stroke="var(--line-strong)"
              />
            </marker>
          </defs>
          <path
            d="M80 52 H138"
            stroke="var(--sky)"
            strokeWidth="1.2"
            markerEnd="url(#airar)"
            strokeDasharray="4 5"
          />
          <path
            d="M194 52 H252"
            stroke="var(--sky)"
            strokeWidth="1.2"
            markerEnd="url(#airar)"
            strokeDasharray="4 5"
          />
          <path
            d="M308 52 H366"
            stroke="var(--coral)"
            strokeWidth="1.2"
            markerEnd="url(#airar)"
            strokeDasharray="4 5"
          />
          <path
            d="M422 52 H480"
            stroke="var(--coral)"
            strokeWidth="1.2"
            markerEnd="url(#airar)"
            strokeDasharray="4 5"
          />
          <circle
            cx="56"
            cy="52"
            r="24"
            fill="none"
            stroke="var(--sky)"
            strokeWidth="1"
          />
          <circle
            cx="166"
            cy="52"
            r="24"
            fill="none"
            stroke="var(--sky)"
            strokeWidth="1"
          />
          <circle
            cx="280"
            cy="52"
            r="26"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
          />
          <circle
            cx="394"
            cy="52"
            r="24"
            fill="none"
            stroke="var(--coral)"
            strokeWidth="1"
          />
          <circle
            cx="504"
            cy="52"
            r="24"
            fill="none"
            stroke="var(--coral)"
            strokeWidth="1"
          />
          <text x="56" y="18" className={c("flow-label")} textAnchor="middle">
            {t("ventilation.outside")}
          </text>
          <text x="56" y="57" className={c("flow-val")} textAnchor="middle">
            {temperatureText(ventilation.outdoor, language)}
          </text>
          <text x="166" y="18" className={c("flow-label")} textAnchor="middle">
            {t("ventilation.inlet")}
          </text>
          <text x="166" y="57" className={c("flow-val")} textAnchor="middle">
            {temperatureText(ventilation.inlet, language)}
          </text>
          <text x="280" y="18" className={c("flow-label")} textAnchor="middle">
            {t("ventilation.room")}
          </text>
          <text x="280" y="58" className={c("flow-val")} textAnchor="middle">
            {temperatureText(temperature, language)}
          </text>
          <text x="394" y="18" className={c("flow-label")} textAnchor="middle">
            {t("ventilation.exhaust")}
          </text>
          <text x="394" y="57" className={c("flow-val")} textAnchor="middle">
            {temperatureText(ventilation.exhaust, language)}
          </text>
          <text x="504" y="18" className={c("flow-label")} textAnchor="middle">
            {t("ventilation.outlet")}
          </text>
          <text x="504" y="57" className={c("flow-val")} textAnchor="middle">
            {temperatureText(ventilation.outlet, language)}
          </text>
          <text x="280" y="102" className={c("flow-label")} textAnchor="middle">
            {t("ventilation.nilanPath")}
          </text>
        </svg>
      </div>
    </div>
  );
}

interface SystemRowProps {
  icon: string;
  label: string;
  value: string | null | undefined;
}

function SystemRow({ icon, label, value }: SystemRowProps) {
  return (
    <div className={c("row")}>
      <Icon name={icon} />
      <div className={c("row-main")}>
        <div className={c("row-name")}>{label}</div>
      </div>
      <span className={c("row-val")} style={{ fontSize: 12 }}>
        {value || "–"}
      </span>
    </div>
  );
}

interface VentilationReadingsProps {
  temperature: number | null | undefined;
  humidity: number | null | undefined;
  step: number | null | undefined;
  efficiency: number | null | undefined;
  language: SheetLanguage;
  t: Translator;
}

/** The four live readings at the top of the sheet. */
function VentilationReadings({
  temperature,
  humidity,
  step,
  efficiency,
  language,
  t,
}: VentilationReadingsProps) {
  return (
    <div className={c("readings")}>
      <Readout
        label={t("ventilation.roomTemp")}
        value={formatNumber(temperature, 1, language)}
        unit="°C"
      />
      <Readout
        label={t("ventilation.humidity")}
        value={countText(humidity)}
        unit="%"
      />
      <Readout
        label={t("ventilation.fanStep")}
        value={countText(step)}
        unit="/ 4"
      />
      <Readout
        label={t("ventilation.efficiency")}
        value={countText(efficiency)}
        unit="%"
      />
    </div>
  );
}

interface ClimateControlsProps {
  climateId: string;
  mode: string | null;
  modeLabel: string;
  fan: string | number | null;
  target: number | null;
  minTemp: number;
  maxTemp: number;
  language: SheetLanguage;
  onTemperature: (value: number) => void;
  onMode: (value: string) => void;
  onFan: (value: number) => void;
  t: Translator;
}

/** The climate entity's setpoint, HVAC mode, and fan-step controls. */
function ClimateControls({
  climateId,
  mode,
  modeLabel,
  fan,
  target,
  minTemp,
  maxTemp,
  language,
  onTemperature,
  onMode,
  onFan,
  t,
}: ClimateControlsProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("ventilation.control")}</div>
        <div className={c("block-label")}>
          <b>{modeLabel}</b>
        </div>
      </div>
      <div className={c("row")} data-act="temp-step" data-entity={climateId}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.setpoint")}</div>
          <div className={c("row-sub")}>{t("ventilation.autoSub")}</div>
        </span>
        <Stepper
          value={target ?? 0}
          min={minTemp}
          max={maxTemp}
          step={1}
          label={t("ventilation.setpoint")}
          formatValue={(value) =>
            target === null ? "–" : temperatureText(value, language)
          }
          onChange={onTemperature}
        />
      </div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.mode")}</div>
        </span>
        <div className={c("seg")}>
          {(
            [
              ["heat_cool", t("ventilation.auto")],
              ["cool", t("ventilation.cool")],
              ["heat", t("ventilation.heat")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={c(mode === value && "active")}
              data-act="hvac"
              data-entity={climateId}
              data-mode={value}
              onClick={() => onMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.fanStep")}</div>
          <div className={c("row-sub")}>{t("ventilation.manualSpeed")}</div>
        </span>
        <div className={c("seg")}>
          {[0, 1, 2, 3, 4].map((step) => (
            <button
              key={step}
              type="button"
              className={c(String(fan) === String(step) && "active")}
              data-act="fan"
              data-entity={climateId}
              data-mode={step}
              onClick={() => onFan(step)}
            >
              {step}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FilterBlockProps {
  status: string;
  filterValue: string | null | undefined;
  resetId: string | undefined;
  daysSinceFilter: number | null | undefined;
  daysToFilter: number | null | undefined;
  inletFan: number | null | undefined;
  exhaustFan: number | null | undefined;
  onReset: () => void;
  t: Translator;
}

/** Filter status, the filter counters, and the alarm reset control. */
function FilterBlock({
  status,
  filterValue,
  resetId,
  daysSinceFilter,
  daysToFilter,
  inletFan,
  exhaustFan,
  onReset,
  t,
}: FilterBlockProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("ventilation.filter")}</div>
        <div className={c("block-label")}>
          <b>{status}</b>
        </div>
      </div>
      <div className={c("readings")}>
        <Readout
          label={t("ventilation.daysSinceChange")}
          value={countText(daysSinceFilter, "0")}
        />
        <Readout
          label={t("ventilation.daysToNext")}
          value={countText(daysToFilter, "0")}
        />
        <Readout
          label={t("ventilation.inletSpeed")}
          value={countText(inletFan, "0")}
          unit="%"
        />
        <Readout
          label={t("ventilation.exhaustSpeed")}
          value={countText(exhaustFan, "0")}
          unit="%"
        />
      </div>
      <div className={c("btn-row")}>
        {resetId ? (
          <button
            type="button"
            className={c("btn small")}
            data-act="press-button"
            data-entity={resetId}
            onClick={onReset}
          >
            {t("ventilation.resetAlarm")}
          </button>
        ) : null}
        <span className={c("status-line")} style={{ marginLeft: "auto" }}>
          <i className={c("dot", !filterOk(filterValue) && "warn")} />
          {filterOk(filterValue) ? t("ventilation.filterOk") : status}
        </span>
      </div>
    </div>
  );
}

interface UserChoiceBlockProps {
  hass: ArcusHass;
  userFunctionId: string | undefined;
  userFunction2Id: string | undefined;
  userFunction: string | null | undefined;
  userFunction2: string | null | undefined;
  userTime: number | null | undefined;
  userSpeed: number | null | undefined;
  onSelect: (entityId: string | undefined, option: string) => void;
  t: Translator;
}

/** The user-function selects and their minute/speed readouts. */
function UserChoiceBlock({
  hass,
  userFunctionId,
  userFunction2Id,
  userFunction,
  userFunction2,
  userTime,
  userSpeed,
  onSelect,
  t,
}: UserChoiceBlockProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("ventilation.userChoice")}</div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.function1")}</div>
        </span>
        <UserSelect
          hass={hass}
          entityId={userFunctionId}
          value={userFunction}
          onSelect={(option) => onSelect(userFunctionId, option)}
        />
      </div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.time")}</div>
        </span>
        <span className={c("row-val")}>
          {countText(userTime, "0")}
          <small>{t("ventilation.min")}</small>
        </span>
      </div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.speed")}</div>
        </span>
        <span className={c("row-val")}>
          {countText(userSpeed, "0")}
          <small>/4</small>
        </span>
      </div>
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("ventilation.function2")}</div>
        </span>
        <UserSelect
          hass={hass}
          entityId={userFunction2Id}
          value={userFunction2}
          onSelect={(option) => onSelect(userFunction2Id, option)}
        />
      </div>
    </div>
  );
}

interface SystemBlockProps {
  aggregateType: string | null | undefined;
  operationMode: string | null | undefined;
  software: string | null | undefined;
  t: Translator;
}

/** Static aggregate information: type, operation mode, and software. */
function SystemBlock({
  aggregateType,
  operationMode,
  software,
  t,
}: SystemBlockProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("ventilation.system")}</div>
      <SystemRow
        icon="info"
        label={t("ventilation.type")}
        value={aggregateType}
      />
      <SystemRow
        icon="fan"
        label={t("ventilation.operation")}
        value={operationMode}
      />
      <SystemRow
        icon="info"
        label={t("ventilation.software")}
        value={software}
      />
    </div>
  );
}

/** Nilan ventilation: readings, the five-node airflow, and the live controls. */
export function VentilationBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const actions = useActions();

  const ventilation = model.ventilation;

  if (!ventilation) {
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
          kicker={t("sheet.kickerSystem")}
          title={t("sheet.titleVentilation")}
          sum={t("empty.dataYet")}
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className={c("sheet-scroll")}>
          <EmptyState icon="fan" title={t("empty.dataYet")} />
        </div>
      </div>
    );
  }

  const language: SheetLanguage =
    model.language === "en" || config.language === "en" ? "en" : "da";

  // The ventilation card carries the same refs as the section; use it as a
  // fallback when a value is missing from the flattened model.
  const card = model.systemCards.find((entry) => entry.id === "ventilation");
  const temperatureValue =
    ventilation.temperature ?? refNumber(hass, card?.temp);
  const humidityValue = ventilation.humidity ?? refNumber(hass, card?.humidity);
  const stepValue = ventilation.step ?? refNumber(hass, card?.step);
  const filterValue = ventilation.filter ?? card?.filter?.state ?? null;
  const status = filterLabel(t, filterValue);
  const climateId = config.ventilation?.climate ?? card?.climate?.entityId;
  const climate = climateId ? hass.states[climateId] : undefined;
  const mode = ventilation.climateMode ?? climate?.state ?? null;
  const fan = ventilation.fanMode ?? climate?.attributes?.fan_mode ?? null;
  const target =
    ventilation.target ?? numberFrom(climate?.attributes?.temperature);
  const minTemp = numberFrom(climate?.attributes?.min_temp) ?? 5;
  const maxTemp = numberFrom(climate?.attributes?.max_temp) ?? 35;
  const resetId = config.ventilation?.resetButton;

  const modeLabel =
    mode === "heat"
      ? t("ventilation.heating")
      : mode === "cool"
        ? t("ventilation.cooling")
        : t("ventilation.autoLower");

  const setTemperature = (value: number): void => {
    if (!climateId) return;
    actions.callService(
      "climate",
      "set_temperature",
      { temperature: value },
      { entity_id: climateId },
    );
  };

  const setMode = (value: string): void => {
    if (!climateId) return;
    actions.callService(
      "climate",
      "set_hvac_mode",
      { hvac_mode: value },
      { entity_id: climateId },
    );
  };

  const setFan = (value: number): void => {
    if (!climateId) return;
    actions.callService(
      "climate",
      "set_fan_mode",
      { fan_mode: String(value) },
      { entity_id: climateId },
    );
  };

  const pressReset = (): void => {
    if (!resetId) return;
    actions.callService("button", "press", {}, { entity_id: resetId });
  };

  const selectOption = (entityId: string | undefined, option: string): void => {
    if (!entityId) return;
    actions.callService(
      "select",
      "select_option",
      { option },
      { entity_id: entityId },
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
        kicker={t("sheet.kickerSystem")}
        title={t("sheet.titleVentilation")}
        sum={t("ventilation.summary", {
          temp: formatNumber(temperatureValue, 1, language),
          step: stepValue ?? "–",
          filter: status,
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <VentilationReadings
          temperature={temperatureValue}
          humidity={humidityValue}
          step={stepValue}
          efficiency={ventilation.efficiency}
          language={language}
          t={t}
        />

        <Airflow
          ventilation={ventilation}
          temperature={temperatureValue}
          language={language}
          t={t}
        />

        {climateId ? (
          <ClimateControls
            climateId={climateId}
            mode={mode}
            modeLabel={modeLabel}
            fan={fan}
            target={target}
            minTemp={minTemp}
            maxTemp={maxTemp}
            language={language}
            onTemperature={setTemperature}
            onMode={setMode}
            onFan={setFan}
            t={t}
          />
        ) : null}

        <FilterBlock
          status={status}
          filterValue={filterValue}
          resetId={resetId}
          daysSinceFilter={ventilation.daysSinceFilter}
          daysToFilter={ventilation.daysToFilter}
          inletFan={ventilation.inletFan}
          exhaustFan={ventilation.exhaustFan}
          onReset={pressReset}
          t={t}
        />

        <UserChoiceBlock
          hass={hass}
          userFunctionId={config.ventilation?.userFunction}
          userFunction2Id={config.ventilation?.userFunction2}
          userFunction={ventilation.userFunction}
          userFunction2={ventilation.userFunction2}
          userTime={ventilation.userTime}
          userSpeed={ventilation.userSpeed}
          onSelect={selectOption}
          t={t}
        />

        <SystemBlock
          aggregateType={ventilation.aggregateType}
          operationMode={ventilation.operationMode}
          software={ventilation.software}
          t={t}
        />
      </div>
    </div>
  );
}
