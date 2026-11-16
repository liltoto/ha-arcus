import {
  formatNumber,
  formatPrice,
  formatUnit,
  numberFrom,
  resolvePriceUnit,
} from "../format";
import type {
  ArcusConfig,
  ChapterKey,
  EntityRef,
  HomeModel,
  RoomModel,
  RoomStats,
  SystemCardModel,
  Translator,
} from "../types";
import { filterOk } from "./filter";

const CHAPTER_KEYS: ChapterKey[] = [
  "energi",
  "sol",
  "vand",
  "sikkerhed",
  "ventilation",
  "teknik",
  "oekonomi",
  "lys",
  "varme",
  "alarmer",
];

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const lower = (value: string): string => {
  return value.toLocaleLowerCase();
};

const capitalizeFirst = (value: string): string => {
  if (!value) return value;
  return `${value[0].toLocaleUpperCase()}${value.slice(1)}`;
};

const refNumber = (ref: EntityRef | null | undefined): number | null => {
  if (!ref) return null;
  if (!ref.state || ref.state === "unavailable" || ref.state === "unknown") {
    return null;
  }
  return numberFrom(ref.state);
};

const refIsOn = (ref: EntityRef | null | undefined): boolean => {
  return ref?.state === "on" || ref?.state === "open";
};

const effectiveTemp = (room: RoomModel): number | null => {
  const direct = refNumber(room.temp);
  if (direct !== null) return direct;
  return numberFrom(room.tempFallback?.attributes?.current_temperature);
};

const roomStats = (model: HomeModel, room: RoomModel): RoomStats => {
  const stored = model.roomStats?.[room.id];
  if (stored) return stored;

  // Fallback for a model assembled by hand (sheet tests, editors).
  const lightIds = new Set<string>();
  for (const group of room.lights) {
    if (group.members.length) {
      for (const member of group.members) lightIds.add(member);
    } else {
      lightIds.add(group.entityId);
    }
    for (const extra of group.extra) lightIds.add(extra);
  }
  return {
    temp: effectiveTemp(room),
    humidity: refNumber(room.humidity),
    co2: refNumber(room.co2),
    lightsOn: 0,
    lightsTotal: lightIds.size,
    open: 0,
    leak: refIsOn(room.leak),
  };
};

export const airText = (
  room: RoomModel,
  stats: RoomStats,
  language: string,
  t: Translator,
): string => {
  if (stats.co2 !== null) {
    return `${t("room.air")} ${formatUnit(
      stats.co2,
      room.co2?.unit ?? "ppm",
      language,
      0,
    )}`;
  }
  if (stats.humidity !== null) {
    return `${t("room.humidityShort")} ${formatUnit(
      stats.humidity,
      "%",
      language,
      0,
    )}`;
  }
  return `${t("room.air")} –`;
};

const lightsFor = (
  room: RoomModel,
  stats: RoomStats,
  t: Translator,
): string => {
  if (!room.lights.length || stats.lightsTotal === 0) return "";
  return t("room.lightsCount", {
    on: stats.lightsOn,
    total: stats.lightsTotal,
  });
};

const openFor = (room: RoomModel, stats: RoomStats, t: Translator): string => {
  if (stats.leak) return t("room.leak");
  if (!room.openings.length) return "";
  if (stats.open > 0) return t("room.openCount", { count: stats.open });
  return t("room.closed");
};

const allStats = (model: HomeModel): RoomStats[] => {
  return model.rooms.map((room) => roomStats(model, room));
};

const lightsSummary = (model: HomeModel): { on: number; total: number } => {
  const stored = model.lightStats as
    | { on?: number; total?: number }
    | undefined;
  if (
    stored &&
    typeof stored.on === "number" &&
    typeof stored.total === "number"
  ) {
    return { on: stored.on, total: stored.total };
  }
  const stats = allStats(model);
  return {
    on: stats.reduce((total, stat) => total + stat.lightsOn, 0),
    total: stats.reduce((total, stat) => total + stat.lightsTotal, 0),
  };
};

const average = (values: Array<number | null>): number | null => {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  if (!numbers.length) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
};

const systemCardSub = (
  card: SystemCardModel,
  language: string,
  t: Translator,
): string => {
  const step = refNumber(card.step);
  const humidity = refNumber(card.humidity);
  if (card.id === "ventilation") {
    const stepLabel = lower(t("ventilation.fanStep"));
    return `${stepLabel} ${step ?? "–"} · ${
      humidity !== null ? formatUnit(humidity, "%", language, 0) : "–"
    }`;
  }
  return humidity !== null
    ? `${formatUnit(humidity, "%", language, 0)} ${t("room.humidityShort")}`
    : "–";
};

const energySummary = (
  model: HomeModel,
  priceUnit: string,
  language: string,
  t: Translator,
): string => {
  const price = model.price;
  const priceNow =
    price?.now !== null && price?.now !== undefined
      ? formatPrice(price.now, language)
      : "–";
  return `<b>${priceNow} ${priceUnit}</b> · ${lower(
    t("solar.load"),
  )} ${formatNumber(model.solar?.load, 0, language)} W`;
};

const solarSummary = (
  model: HomeModel,
  language: string,
  t: Translator,
): string => {
  return `<b>${formatNumber(
    model.solar?.batterySoc,
    0,
    language,
  )} % ${lower(t("solar.battery"))}</b> · ${formatNumber(
    model.solar?.today,
    1,
    language,
  )} ${t("energy.kwh")} ${lower(t("common.today"))}`;
};

const waterSummary = (
  model: HomeModel,
  config: ArcusConfig,
  language: string,
  t: Translator,
): string => {
  if (model.water?.state === null && model.water?.salt === null) {
    return `<b>${formatNumber(
      model.water?.day,
      1,
      language,
    )} L ${lower(t("common.today"))}</b> · ${formatNumber(
      model.water?.month,
      0,
      language,
    )} L ${lower(t("water.thisMonth"))}`;
  }
  const softenerName =
    model.water?.softenerName || config.water?.softenerName || "BWT";
  return `<b>${formatNumber(
    model.water?.day,
    1,
    language,
  )} L ${lower(t("common.today"))}</b> · ${softenerName} ${
    model.water?.state ?? "–"
  } · ${lower(t("water.salt"))} ${formatNumber(
    model.water?.salt,
    0,
    language,
  )} %`;
};

const securitySummary = (model: HomeModel, t: Translator): string => {
  const security = model.security;
  if (security?.leak) {
    return `<b>${escapeHtml(capitalizeFirst(t("security.leakDetected")))}</b>`;
  }
  return `<b>${escapeHtml(
    capitalizeFirst(
      security?.open
        ? t("security.summaryOpen", { count: security.open })
        : t("security.summaryClosed"),
    ),
  )}</b> · ${t("security.noLeak")}`;
};

const ventilationSummary = (
  model: HomeModel,
  language: string,
  t: Translator,
): string => {
  const filter = model.ventilation?.filter;
  return `<b>${formatNumber(
    model.ventilation?.temperature,
    1,
    language,
  )}°</b> · ${lower(t("ventilation.fanStep"))} ${
    model.ventilation?.step ?? "–"
  } · ${
    filterOk(filter)
      ? t("ventilation.filterOk")
      : escapeHtml((filter ?? "").toLowerCase())
  }`;
};

const techSummary = (
  model: HomeModel,
  language: string,
  t: Translator,
): string => {
  const tech = model.tech;
  return `<b>${
    tech?.router !== null && tech?.router !== undefined
      ? `${formatNumber(tech.router, 1, language)} ms`
      : "–"
  }</b> ${lower(t("tech.router"))} · ${
    tech?.google !== null && tech?.google !== undefined
      ? `${formatNumber(tech.google, 1, language)} ms`
      : "–"
  } ${lower(t("tech.google"))}`;
};

const economySummary = (
  model: HomeModel,
  language: string,
  t: Translator,
): string => {
  const economy = model.economy;
  const change =
    economy?.change !== null && economy?.change !== undefined
      ? `${economy.change >= 0 ? "+" : ""}${formatNumber(
          economy.change,
          2,
          language,
        )}`
      : "–";
  return `<b>${formatNumber(
    economy?.value,
    2,
    language,
  )}</b> · ${change} ${lower(t("common.today"))}`;
};

const chapterLightsSummary = (model: HomeModel, t: Translator): string => {
  const lightStats = lightsSummary(model);
  const lightCount = t("room.lightCountOf", {
    on: lightStats.on,
    total: lightStats.total,
  });
  const lightSummary = t("lights.summary", {
    on: lightStats.on,
    total: lightStats.total,
  });
  const lightRest = lightSummary.startsWith(lightCount)
    ? lightSummary.slice(lightCount.length)
    : "";
  return `<b>${escapeHtml(lightCount)}</b>${escapeHtml(lightRest)}`;
};

const heatingSummary = (
  model: HomeModel,
  language: string,
  t: Translator,
): string => {
  const currentTemps = model.heating
    .map((zone) => numberFrom(zone.entity.attributes?.current_temperature))
    .filter((value): value is number => value !== null);
  const targetTemps = model.heating
    .map((zone) => numberFrom(zone.entity.attributes?.temperature))
    .filter((value): value is number => value !== null);
  const currentAverage = average(currentTemps);
  const targetAverage = average(targetTemps);
  return `<b>${formatNumber(currentAverage, 1, language)}°</b> · ${formatNumber(
    targetAverage,
    1,
    language,
  )}° ${lower(t("heating.setpoint"))}`;
};

const alertsSummary = (model: HomeModel, t: Translator): string => {
  if (!model.alerts.length) {
    return t("alerts.calmTitle");
  }
  const first = model.alerts[0];
  const summary = t("alerts.countTitle", {
    count: model.alerts.length,
    title: first.title,
  });
  const split = summary.indexOf(" · ");
  return split >= 0
    ? `<b>${escapeHtml(summary.slice(0, split))}</b> · ${escapeHtml(
        summary.slice(split + 3),
      )}`
    : `<b>${escapeHtml(summary)}</b>`;
};

const defaultSummary = (): string => {
  return "–";
};

const chapterSummaries = (
  model: HomeModel,
  config: ArcusConfig,
  priceUnit: string,
  language: string,
  t: Translator,
): Record<string, string> => {
  const out: Record<string, string> = {
    ch_energi_sum: energySummary(model, priceUnit, language, t),
    ch_sol_sum: solarSummary(model, language, t),
    ch_vand_sum: waterSummary(model, config, language, t),
    ch_sikkerhed_sum: securitySummary(model, t),
    ch_ventilation_sum: ventilationSummary(model, language, t),
    ch_teknik_sum: techSummary(model, language, t),
    ch_oekonomi_sum: economySummary(model, language, t),
    ch_lys_sum: chapterLightsSummary(model, t),
    ch_varme_sum: heatingSummary(model, language, t),
    ch_alarmer_sum: alertsSummary(model, t),
    ch_alarmer_num: String(model.alerts.length),
  };

  // Every chapter card asks for a binding; keep disabled chapters valid too.
  for (const key of CHAPTER_KEYS) {
    if (!(`ch_${key}_sum` in out)) out[`ch_${key}_sum`] = defaultSummary();
  }
  return out;
};

/**
 * Flatten the model into the string keys the home view binds to. Chapter
 * summaries are the only HTML values, matching the legacy `data-bind-html`
 * cards.
 */
export const buildBindings = (
  model: HomeModel,
  config: ArcusConfig,
  t: Translator,
): Record<string, string> => {
  const language = model.language;
  const priceUnit = resolvePriceUnit(undefined, config, language);
  const stats = allStats(model);
  const lights = lightsSummary(model);
  const open =
    model.security?.open ?? stats.reduce((total, stat) => total + stat.open, 0);
  const indoor =
    average(stats.map((stat) => stat.temp)) ??
    (typeof model.ventilation?.temperature === "number"
      ? model.ventilation.temperature
      : null);
  const batterySoc = model.solar?.batterySoc ?? null;
  const solarPower = model.solar?.power ?? null;
  const solarToday = model.solar?.today ?? null;

  const roomsMetaTemplate = t("hero.roomsMeta");
  let roomsMeta = roomsMetaTemplate
    .replace("{rooms}", String(model.rooms.length))
    .replace("{open}", String(open))
    .replace("{lights}", `<b>${lights.on}</b>`);
  // The prototype bolds the whole "7 rum" phrase, not just the number.
  const firstDivider = roomsMeta.indexOf(" · ");
  if (firstDivider > 0) {
    roomsMeta = `<b>${roomsMeta.slice(0, firstDivider)}</b>${roomsMeta.slice(
      firstDivider,
    )}`;
  }

  const bindings: Record<string, string> = {
    roomsMeta,
    indoor: formatNumber(indoor, 1, language),
    indoorSub: t("hero.indoorSub"),
    price: formatPrice(model.price?.now, language),
    priceSub: `${priceUnit} · ${t("common.now").toLocaleLowerCase()}`,
    battery: formatNumber(batterySoc, 0, language),
    batterySub:
      batterySoc === null
        ? "–"
        : batterySoc < 20
          ? t("hero.batteryLow")
          : batterySoc > 80
            ? t("hero.batteryFull")
            : t("hero.batterySub"),
    solarNow: formatNumber(solarPower, 0, language),
    solarSub:
      solarToday !== null
        ? t("hero.solarToday", {
            value: formatNumber(solarToday, 1, language),
          })
        : t("hero.solarTodayFallback"),
    alertPill: String(model.alerts.length),
  };

  for (const room of model.rooms) {
    const stat = roomStats(model, room);
    bindings[`r_${room.id}_temp`] = formatNumber(stat.temp, 1, language);
    bindings[`r_${room.id}_air`] = airText(room, stat, language, t);
    bindings[`r_${room.id}_lights`] = lightsFor(room, stat, t);
    bindings[`r_${room.id}_open`] = openFor(room, stat, t);
  }

  for (const card of model.systemCards) {
    bindings[`s_${card.id}_temp`] = formatNumber(
      refNumber(card.temp),
      1,
      language,
    );
    bindings[`s_${card.id}_sub`] = systemCardSub(card, language, t);
  }

  Object.assign(
    bindings,
    chapterSummaries(model, config, priceUnit, language, t),
  );
  return bindings;
};
