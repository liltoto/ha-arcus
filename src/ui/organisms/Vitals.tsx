import type { CSSProperties, ReactNode } from "react";
import {
  formatNumber,
  numberFrom,
  resolveCurrency,
  resolveTempUnit,
} from "../../format";
import { resolveLanguage } from "../../localize";
import type { GraphInput } from "../../render/graph";
import type {
  ArcusConfig,
  ArcusHass,
  CustomVitalConfig,
  HomeModel,
  Language,
  RoomModel,
  TemperatureUnit,
  Translator,
  VitalItemConfig,
  VitalPresetKey,
} from "../../types";
import type { HistoryCache } from "../../data/history";
import { clipSeries, type ResolvedHistoryRange } from "../../range";
import { Icon } from "../atoms/Icon";
import {
  useActions,
  useBindings,
  useConfig,
  useHass,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useRange,
  useTranslator,
} from "../hooks";
import { VitalStat } from "../molecules/VitalStat";
import { c } from "../styles/classes";

const RING_CIRCUMFERENCE = 100.5;

/** The legacy home shipped these four tiles when `vitals` was unset. */
const DEFAULT_VITALS: VitalPresetKey[] = [
  "indoor",
  "price",
  "battery",
  "solar",
];

/** `skur` predates room kinds; the id is only a legacy fallback. */
const isOutdoorRoom = (room: RoomModel): boolean => {
  return room.kind === "outdoor" || (!room.kind && room.id === "skur");
};

const average = (values: Array<number | null>): number | null => {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (!valid.length) return null;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
};

/** The legacy battery gauge changes colour at the two comfort thresholds. */
const ringStroke = (soc: number): string => {
  if (soc < 20) return "var(--coral)";
  if (soc > 80) return "var(--sage)";
  return "var(--brass)";
};

const sparkGraph = (
  values: Array<number | null>,
  range: ResolvedHistoryRange,
  unit: string,
  decimals: number,
): GraphInput | null => {
  if (!values.length) return null;
  return {
    mode: "line",
    start: range.start,
    end: range.end,
    unit,
    decimals,
    series: [{ values }],
  };
};

/** One rendered tile, reduced from either a preset key or a custom object. */
interface VitalView {
  id: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  spark?: Array<number | null>;
  sparkUnit: string;
  decimals: number;
  color: string;
  route?: string;
  ring?: ReactNode;
}

interface VitalsContext {
  bindings: Record<string, string>;
  t: Translator;
  model: HomeModel;
  config: ArcusConfig;
  hass: ArcusHass;
  history: HistoryCache;
  nowMs: number;
  range: ResolvedHistoryRange;
  language: Language;
  currency: string;
  tempUnit: TemperatureUnit;
  indoorRoute: string;
  outdoorRoute: string;
  soc: number;
  batteryOffset: number;
  indoorSpark: Array<number | null>;
  solarSpark: Array<number | null>;
  outdoorSpark: Array<number | null>;
  humiditySpark: Array<number | null>;
  co2Spark: Array<number | null>;
  powerSpark: Array<number | null>;
  waterSpark: Array<number | null>;
  outdoorTemp: number | null;
  humidity: number | null;
  co2: number | null;
}

const roomSeries = (
  history: HistoryCache,
  entityId: string | undefined,
  fill: number | "hold",
  range: ResolvedHistoryRange,
  now: Date,
): Array<number | null> => {
  const values = history.series(entityId ?? "", {
    buckets: 96,
    fill,
    start: range.start,
    end: range.end,
  });
  return clipSeries(values, 96, range, now);
};

interface RoomContext {
  indoorRooms: RoomModel[];
  outdoorRoom: RoomModel | undefined;
  displayRoom: RoomModel | undefined;
  humidityEntity: string | undefined;
  co2Entity: string | undefined;
  humidity: number | null;
  co2: number | null;
}

const roomContext = (model: HomeModel, config: ArcusConfig): RoomContext => {
  const indoorRooms = model.rooms.filter((room) => !isOutdoorRoom(room));
  const outdoorRoom = model.rooms.find(isOutdoorRoom);
  const displayRoom = indoorRooms[0];
  const stats = model.roomStats;
  return {
    indoorRooms,
    outdoorRoom,
    displayRoom,
    humidityEntity:
      config.ventilation?.humidity ??
      indoorRooms.find((room) => room.humidity?.entityId)?.humidity?.entityId,
    co2Entity: indoorRooms.find((room) => room.co2?.entityId)?.co2?.entityId,
    humidity: average(
      indoorRooms.map((room) => stats?.[room.id]?.humidity ?? null),
    ),
    co2: average(indoorRooms.map((room) => stats?.[room.id]?.co2 ?? null)),
  };
};

interface SparkSeries {
  indoorSpark: Array<number | null>;
  solarSpark: Array<number | null>;
  outdoorSpark: Array<number | null>;
  humiditySpark: Array<number | null>;
  co2Spark: Array<number | null>;
  powerSpark: Array<number | null>;
  waterSpark: Array<number | null>;
}

const sparkSeries = (
  history: HistoryCache,
  config: ArcusConfig,
  rooms: RoomContext,
  range: ResolvedHistoryRange,
  now: Date,
): SparkSeries => {
  return {
    indoorSpark: roomSeries(
      history,
      config.ventilation?.temperature ?? rooms.displayRoom?.temp?.entityId,
      "hold",
      range,
      now,
    ),
    solarSpark: roomSeries(history, config.solar?.power, 0, range, now),
    outdoorSpark: roomSeries(
      history,
      rooms.outdoorRoom?.temp?.entityId ?? config.ventilation?.outdoor,
      "hold",
      range,
      now,
    ),
    humiditySpark: roomSeries(
      history,
      rooms.humidityEntity,
      "hold",
      range,
      now,
    ),
    co2Spark: roomSeries(history, rooms.co2Entity, "hold", range, now),
    powerSpark: roomSeries(history, config.solar?.load, "hold", range, now),
    waterSpark: roomSeries(history, config.water?.day, "hold", range, now),
  };
};

const buildContext = (input: {
  bindings: Record<string, string>;
  t: Translator;
  model: HomeModel;
  config: ArcusConfig;
  hass: ArcusHass;
  history: HistoryCache;
  nowMs: number;
  range: ResolvedHistoryRange;
}): VitalsContext => {
  const { bindings, t, model, config, hass, history, nowMs, range } = input;
  const language = resolveLanguage(hass.language, config);
  const rooms = roomContext(model, config);
  const soc = model.solar?.batterySoc ?? 0;

  return {
    bindings,
    t,
    model,
    config,
    hass,
    history,
    nowMs,
    range,
    language,
    currency: resolveCurrency(hass, config, language),
    tempUnit: resolveTempUnit(hass, config),
    indoorRoute: rooms.displayRoom ? `rum/${rooms.displayRoom.id}` : "alle",
    outdoorRoute: rooms.outdoorRoom ? `rum/${rooms.outdoorRoom.id}` : "hjem",
    soc,
    batteryOffset: RING_CIRCUMFERENCE - (soc / 100) * RING_CIRCUMFERENCE,
    ...sparkSeries(history, config, rooms, range, new Date(nowMs)),
    outdoorTemp:
      model.weather?.temp ?? numberFrom(model.skur?.temp?.state ?? null),
    humidity: rooms.humidity,
    co2: rooms.co2,
  };
};

const batteryRing = (ctx: VitalsContext): ReactNode => {
  return (
    <svg viewBox="0 0 40 40">
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="var(--line)"
        strokeWidth="2.5"
      />
      <circle
        data-battery-ring
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke={ringStroke(ctx.soc)}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={ctx.batteryOffset}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
};

type PresetBuilder = (ctx: VitalsContext) => VitalView;

/**
 * Every preset is a tiny builder. Keeping them in a map instead of a switch
 * keeps the component readable and the branch count flat as presets grow.
 */
const PRESET_VIEWS: Record<VitalPresetKey, PresetBuilder> = {
  indoor: (ctx) => ({
    id: "indoor",
    label: ctx.t("hero.indoor"),
    value: ctx.bindings.indoor,
    unit: ctx.tempUnit,
    sub: ctx.bindings.indoorSub,
    spark: ctx.indoorSpark,
    sparkUnit: ctx.tempUnit,
    decimals: 1,
    color: "var(--sky)",
    route: ctx.indoorRoute,
  }),
  outdoor: (ctx) => ({
    id: "outdoor",
    label: ctx.t("hero.outdoor"),
    value: formatNumber(ctx.outdoorTemp, 1, ctx.language),
    unit: ctx.tempUnit,
    sub: ctx.t("hero.outdoorSub"),
    spark: ctx.outdoorSpark,
    sparkUnit: ctx.tempUnit,
    decimals: 1,
    color: "var(--sky)",
    route: ctx.outdoorRoute,
  }),
  price: (ctx) => {
    // The model curve is today's hourly prices. For a past day (or a
    // multi-day window) read the configured price sensor back instead.
    const priceSpark =
      ctx.range.live && ctx.range.days === 1
        ? (ctx.model.price?.values ?? [])
        : roomSeries(
            ctx.history,
            ctx.config.price?.current ?? ctx.config.price?.spot,
            "hold",
            ctx.range,
            new Date(ctx.nowMs),
          );
    return {
      id: "price",
      label: ctx.t("hero.priceNow"),
      value: ctx.bindings.price,
      unit: ctx.currency,
      sub: ctx.bindings.priceSub,
      spark: priceSpark,
      sparkUnit: ctx.currency,
      decimals: 2,
      color: "var(--brass)",
      route: "energi",
    };
  },
  battery: (ctx) => ({
    id: "battery",
    label: ctx.t("hero.battery"),
    value: ctx.bindings.battery,
    unit: "%",
    sub: ctx.bindings.batterySub,
    sparkUnit: "%",
    decimals: 0,
    color: "var(--sky)",
    route: "sol",
    ring: batteryRing(ctx),
  }),
  solar: (ctx) => ({
    id: "solar",
    label: ctx.t("hero.solarNow"),
    value: ctx.bindings.solarNow,
    unit: "W",
    sub: ctx.bindings.solarSub,
    spark: ctx.solarSpark,
    sparkUnit: "W",
    decimals: 0,
    color: "var(--amber)",
    route: "sol",
  }),
  power: (ctx) => ({
    id: "power",
    label: ctx.t("hero.power"),
    value: formatNumber(ctx.model.solar?.load, 0, ctx.language),
    unit: "W",
    sub: ctx.t("hero.powerSub"),
    spark: ctx.powerSpark,
    sparkUnit: "W",
    decimals: 0,
    color: "var(--brass)",
    route: "energi",
  }),
  humidity: (ctx) => ({
    id: "humidity",
    label: ctx.t("hero.humidity"),
    value: formatNumber(ctx.humidity, 0, ctx.language),
    unit: "%",
    sub: ctx.t("hero.humiditySub"),
    spark: ctx.humiditySpark,
    sparkUnit: "%",
    decimals: 0,
    color: "var(--sky)",
    route: ctx.indoorRoute,
  }),
  co2: (ctx) => ({
    id: "co2",
    label: ctx.t("hero.co2"),
    value: formatNumber(ctx.co2, 0, ctx.language),
    unit: "ppm",
    sub: ctx.t("hero.co2Sub"),
    spark: ctx.co2Spark,
    sparkUnit: "ppm",
    decimals: 0,
    color: "var(--sage)",
    route: ctx.indoorRoute,
  }),
  water: (ctx) => {
    const unit = ctx.config.units?.water ?? "L";
    return {
      id: "water",
      label: ctx.t("hero.water"),
      value: formatNumber(ctx.model.water?.day, 0, ctx.language),
      unit,
      sub: ctx.t("hero.waterSub"),
      spark: ctx.waterSpark,
      sparkUnit: unit,
      decimals: 0,
      color: "var(--sky)",
      route: "vand",
    };
  },
  security: (ctx) => securityView(ctx),
  lights: (ctx) => lightsView(ctx),
};

const securityView = (ctx: VitalsContext): VitalView => {
  const open = ctx.model.security?.open ?? 0;
  const leak = Boolean(ctx.model.security?.leak);
  return {
    id: "security",
    label: ctx.t("hero.security"),
    value: leak
      ? ctx.t("security.leakDetected")
      : formatNumber(open, 0, ctx.language),
    unit: leak
      ? undefined
      : open
        ? ctx.t("security.open")
        : ctx.t("security.closed"),
    sub: ctx.t("security.doorsWindows"),
    sparkUnit: "",
    decimals: 0,
    color: leak ? "var(--coral)" : "var(--sage)",
    route: "sikkerhed",
  };
};

const lightsView = (ctx: VitalsContext): VitalView => {
  const on = ctx.model.lightStats?.on ?? 0;
  const total = ctx.model.lightStats?.total ?? 0;
  return {
    id: "lights",
    label: ctx.t("hero.lights"),
    value: formatNumber(on, 0, ctx.language),
    unit: `/ ${formatNumber(total, 0, ctx.language)}`,
    sub: ctx.t("hero.lightsSub"),
    sparkUnit: "",
    decimals: 0,
    color: "var(--amber)",
    route: "lys",
  };
};

const presetView = (key: VitalPresetKey, ctx: VitalsContext): VitalView => {
  return PRESET_VIEWS[key](ctx);
};

const customView = (
  vital: CustomVitalConfig,
  index: number,
  ctx: VitalsContext,
): VitalView => {
  if (!vital.entity) {
    const preset = presetView(vital.key ?? "indoor", ctx);
    return {
      ...preset,
      id: `custom:${index}`,
      label: vital.label ?? preset.label,
      unit: vital.unit ?? preset.unit,
      route: vital.route ?? preset.route,
      decimals: vital.decimals ?? preset.decimals,
      color: vital.color ?? preset.color,
    };
  }

  const entity = vital.entity;
  const state = ctx.hass.states[entity];
  const decimals = vital.decimals ?? 1;
  const unit =
    vital.unit ??
    (typeof state?.attributes?.unit_of_measurement === "string"
      ? state.attributes.unit_of_measurement
      : undefined);
  const label =
    vital.label ??
    (typeof state?.attributes?.friendly_name === "string"
      ? state.attributes.friendly_name
      : entity);

  return {
    id: `custom:${index}`,
    label,
    value: formatNumber(state?.state, decimals, ctx.language),
    unit,
    spark: roomSeries(
      ctx.history,
      entity,
      "hold",
      ctx.range,
      new Date(ctx.nowMs),
    ),
    sparkUnit: unit ?? "",
    decimals,
    color: vital.color ?? "var(--sky)",
    route: vital.route,
  };
};

const viewFor = (
  item: VitalItemConfig,
  index: number,
  ctx: VitalsContext,
): VitalView => {
  return typeof item === "string"
    ? presetView(item, ctx)
    : customView(item, index, ctx);
};

/**
 * The hero statistics, the weather strip, and the first alert.
 *
 * Every sparkline reads the shared history cache and re-renders through the
 * cache subscription. There is no card-side `data-spark` patcher anymore.
 *
 * `config.vitals` replaces the legacy four tiles with any mix of presets and
 * custom entity tiles. When it is unset the default order, labels, units,
 * routes, and spark colours are unchanged.
 */
export const Vitals = () => {
  const bindings = useBindings();
  const t = useTranslator();
  const model = useModel();
  const config = useConfig();
  const hass = useHass();
  const history = useHistory();
  const now = useNow();
  const range = useRange();
  const actions = useActions();
  useHistoryVersion();

  const current = now();
  const ctx = buildContext({
    bindings,
    t,
    model,
    config,
    hass,
    history,
    nowMs: current.getTime(),
    range,
  });
  const items: VitalItemConfig[] = config.vitals?.length
    ? config.vitals
    : DEFAULT_VITALS;
  const views = items.map((item, index) => viewFor(item, index, ctx));
  const alert = model.alerts[0];
  const navigate = (route?: string) =>
    route ? () => actions.navigate(route) : undefined;
  const cols = Math.min(Math.max(views.length, 1), 4);
  const gridStyle = {
    "--vitals-cols": cols,
    "--vitals-cols-sm": Math.min(cols, 2),
  } as CSSProperties;

  return (
    <>
      <div className={c("vitals")} style={gridStyle}>
        {views.map((view, index) => (
          <VitalStat
            key={`${view.id}:${index}`}
            label={view.label}
            value={view.value}
            unit={view.unit}
            sub={view.sub}
            spark={view.spark}
            sparkGraph={
              view.spark
                ? sparkGraph(view.spark, range, view.sparkUnit, view.decimals)
                : null
            }
            sparkColor={view.color}
            ring={view.ring}
            onClick={navigate(view.route)}
          />
        ))}
      </div>
      <div
        className={c("weather-strip")}
        dangerouslySetInnerHTML={{ __html: bindings.weatherStrip ?? "" }}
      />
      <div data-alert-slot>
        {alert ? (
          <button
            type="button"
            className={c("alert-band")}
            data-nav={alert.route}
            onClick={() => actions.navigate(alert.route)}
          >
            <Icon name="alert" />
            <span className={c("alert-text")}>
              <b>{alert.title}.</b> {alert.text}
            </span>
            {model.alerts.length > 1 ? (
              <span className={c("alert-count")}>
                +{model.alerts.length - 1}
              </span>
            ) : null}
            <Icon name="arrow" />
          </button>
        ) : null}
      </div>
    </>
  );
};
