import type { HistoryCache } from "../../../../data/history";
import {
  formatPrice,
  resolveCurrency,
  resolvePriceUnit,
} from "../../../../format";
import type {
  ArcusConfig,
  ArcusHass,
  EnergyApplianceConfig,
  EnergyEvConfig,
  HomeModel,
  Language,
  PriceModel,
  Translator,
} from "../../../../types";

const nowOf = (now: () => Date): Date => {
  try {
    const value = now();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    /* fall through to the wall clock */
  }
  return new Date();
};

const hourLabel = (hour: number): string => {
  return String(Math.trunc(hour)).padStart(2, "0");
};

const stateNumber = (hass: ArcusHass, entityId: string): number | null => {
  const raw = hass.states?.[entityId]?.state;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim()) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
};

/**
 * The legacy card exposed `_n()` to the string sheets. The React tree reads the
 * same live states from `hass`; the history cache is the last resort when a
 * configured price sensor has dropped out of the state machine.
 */
export const liveNumber = (
  hass: ArcusHass,
  history: HistoryCache,
  entityId: string | undefined,
  fallback: number | null,
): number | null => {
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback;
  }
  if (!entityId) return null;

  const live = stateNumber(hass, entityId);
  if (live !== null) return live;

  const series = history.series(entityId);
  for (let index = series.length - 1; index >= 0; index--) {
    const value = series[index];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

export const liveOn = (
  hass: ArcusHass,
  entityId: string | undefined,
  fallback: boolean | undefined,
): boolean => {
  if (typeof fallback === "boolean") return fallback;
  if (!entityId) return false;
  const state = hass.states?.[entityId]?.state;
  return state === "on" || state === "open";
};

const priceSection = (model: HomeModel): PriceModel | undefined => {
  const price = model.price;
  const energy = model.energy;
  if (price && Array.isArray(price.values) && price.values.length) {
    return price;
  }
  return energy ?? price;
};

const hasCurve = (price: PriceModel | undefined): price is PriceModel => {
  return Boolean(price && Array.isArray(price.values) && price.values.length);
};

const adjacentValue = (values: number[], hour: number): number | null => {
  if (hour < 0 || hour >= values.length) return null;
  return values[hour];
};

const priceReading = (
  hass: ArcusHass,
  history: HistoryCache,
  entityId: string | undefined,
  fallback: number | null | undefined,
): number | null => {
  return liveNumber(hass, history, entityId, fallback ?? null);
};

interface PriceReadings {
  buy: number;
  sell: number | null;
  spot: number | null;
  next: number | null;
  lowest: number | null;
  highest: number | null;
  previous: number | null;
  tomorrow: boolean;
}

const resolveReadings = (
  hass: ArcusHass,
  config: ArcusConfig,
  history: HistoryCache,
  price: PriceModel,
  nowHour: number,
): PriceReadings => {
  const values = price.values;
  return {
    buy: price.buy ?? price.now,
    sell: priceReading(hass, history, config.price?.sell, price.sell),
    spot: priceReading(hass, history, config.price?.spot, price.spot),
    next: priceReading(
      hass,
      history,
      config.price?.next,
      price.next ?? adjacentValue(values, nowHour + 1),
    ),
    lowest: priceReading(
      hass,
      history,
      config.price?.lowest,
      price.lowest ?? price.min,
    ),
    highest: priceReading(
      hass,
      history,
      config.price?.highest,
      price.highest ?? price.max,
    ),
    previous: priceReading(
      hass,
      history,
      config.price?.previous,
      price.previous ?? adjacentValue(values, nowHour - 1),
    ),
    tomorrow: liveOn(hass, config.price?.tomorrow, price.tomorrow),
  };
};

const resolveCheapWindow = (
  cheap: PriceModel["cheapest"],
): {
  start: string;
  end: string;
} => {
  return {
    start: cheap ? hourLabel(cheap.start) : "–",
    end: cheap ? hourLabel(cheap.end) : "–",
  };
};

/** Swap the Danish default tokens for the configured currency and unit. */
const localize = (text: string, token: string, replacement: string): string => {
  return replacement === token ? text : text.replaceAll(token, replacement);
};

interface EnergyCopyInput {
  t: Translator;
  priceUnit: string;
  currency: string;
  buyText: string;
  sellText: string;
  spotText: string;
  cheap: PriceModel["cheapest"];
  cheapStart: string;
  cheapEnd: string;
}

interface EnergyCopy {
  summary: string;
  nowNote: string;
}

const resolveCopy = ({
  t,
  priceUnit,
  currency,
  buyText,
  sellText,
  spotText,
  cheap,
  cheapStart,
  cheapEnd,
}: EnergyCopyInput): EnergyCopy => {
  const summary = cheap
    ? localize(
        t("energy.summary", {
          price: buyText,
          start: cheapStart,
          end: cheapEnd,
        }),
        t("common.perKwh"),
        priceUnit,
      )
    : `${buyText} ${priceUnit}`;
  return {
    summary,
    nowNote: localize(
      t("energy.nowNote", { sell: sellText, spot: spotText }),
      t("energy.kr"),
      currency,
    ),
  };
};

interface EnergyDevicesView {
  ev: EnergyEvConfig | undefined;
  standby: string | undefined;
  appliances: EnergyApplianceConfig[];
}

const resolveDevices = (config: ArcusConfig): EnergyDevicesView => {
  const energy = config.energy;
  return {
    ev: energy?.ev,
    standby: energy?.standby,
    appliances: energy?.appliances ?? [],
  };
};

/** Everything the always-rendered price blocks need, resolved once. */
export interface EnergyView {
  price: PriceModel;
  nowDate: Date;
  language: Language;
  currency: string;
  priceUnit: string;
  cheap: PriceModel["cheapest"];
  cheapStart: string;
  cheapEnd: string;
  cheapText: string;
  buyText: string;
  sellText: string;
  spotText: string;
  nextText: string;
  lowestText: string;
  highestText: string;
  previousText: string;
  summary: string;
  nowNote: string;
  tomorrow: boolean;
  ev: EnergyEvConfig | undefined;
  standby: string | undefined;
  appliances: EnergyApplianceConfig[];
}

/**
 * Resolve the live price readings and localized copy once per render. Returns
 * null when the model has no usable curve, so the body can show its calm
 * empty state instead.
 */
export const resolveEnergyView = (
  hass: ArcusHass,
  model: HomeModel,
  config: ArcusConfig,
  history: HistoryCache,
  now: () => Date,
  t: Translator,
): EnergyView | null => {
  const price = priceSection(model);
  if (!hasCurve(price)) return null;

  const language = model.language;
  const nowDate = nowOf(now);
  const nowHour = nowDate.getHours();
  const currency = resolveCurrency(hass, config, language);
  const priceUnit = resolvePriceUnit(hass, config, language);
  const readings = resolveReadings(hass, config, history, price, nowHour);
  const cheap = price.cheapest ?? null;
  const { start: cheapStart, end: cheapEnd } = resolveCheapWindow(cheap);
  const buyText = formatPrice(readings.buy, language);
  const sellText = formatPrice(readings.sell, language);
  const spotText = formatPrice(readings.spot, language);
  const { summary, nowNote } = resolveCopy({
    t,
    priceUnit,
    currency,
    buyText,
    sellText,
    spotText,
    cheap,
    cheapStart,
    cheapEnd,
  });
  const devices = resolveDevices(config);

  return {
    price,
    nowDate,
    language,
    currency,
    priceUnit,
    cheap,
    cheapStart,
    cheapEnd,
    cheapText: formatPrice(cheap?.avg ?? null, language),
    buyText,
    sellText,
    spotText,
    nextText: formatPrice(readings.next, language),
    lowestText: formatPrice(readings.lowest, language),
    highestText: formatPrice(readings.highest, language),
    previousText: formatPrice(readings.previous, language),
    summary,
    nowNote,
    tomorrow: readings.tomorrow,
    ev: devices.ev,
    standby: devices.standby,
    appliances: devices.appliances,
  };
};
