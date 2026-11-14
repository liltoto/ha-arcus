import type { HistoryCache } from "../data/history";
import { escapeHtml, formatNumber, numberFromState } from "../format";
import type {
  ArcusConfig,
  ChapterKey,
  HomeModel,
  LightGroupModel,
  Translator,
} from "../types";
import { c } from "../ui/styles/classes";
import { arcPoint, priceColor, sparkPath } from "./charts";
import { graphAttrs } from "./graph";

export interface ChapterArtContext {
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  language?: string;
  history?: HistoryCache;
  now?: Date;
  isOn?: (entityId: string) => boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * The small illustration at the bottom of each chapter card. The home view
 * renders a model-only version for the first paint; the card calls it again
 * with the history cache and live on/off states.
 */
export function renderChapterArt(
  key: ChapterKey | string,
  context: ChapterArtContext,
): string {
  const { model, t } = context;
  const language = context.language ?? languageOf(context.config, t);
  const isOn = context.isOn ?? (() => false);

  if (key === "energi") {
    const price = model.price;
    if (!price || !price.values.length) return "";
    const now = context.now ?? new Date();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const graph = graphAttrs({
      mode: "bars",
      start: dayStart,
      end: dayStart + 86_400_000,
      unit: "kr",
      decimals: 2,
      series: [{ values: price.values }],
    });
    return `<div class="${c("price-bars")}" ${graph}>${price.values
      .map(
        (value) =>
          `<i style="--bar:${priceColor(
            value,
            price.min,
            price.max,
          )};height:${Math.max(
            6,
            ((value - price.min) / (price.max - price.min || 1)) * 100,
          )}%"></i>`,
      )
      .join("")}</div>`;
  }

  if (key === "sol") {
    const series = model.solar?.forecastSeries ?? [];
    const max = Math.max(3000, ...series.map((point) => point.v), 1);
    const points = series.map((point) => {
      const fraction = dayFraction(point.t);
      const { x, y } = arcPoint(fraction, 220, 0, 100, 80);
      return `${x.toFixed(1)},${(y - (point.v / max) * 70).toFixed(1)}`;
    });
    const line = points.length ? `M${points.join("L")}` : "";
    const area = points.length ? `${line}L220,100L0,100Z` : "";
    const soc = model.solar?.batterySoc ?? 0;
    const graph = series.length
      ? graphAttrs({
          mode: "timed",
          points: series.map((point) => ({
            t: point.t.getTime(),
            v: point.v,
          })),
          unit: "W",
          decimals: 0,
        })
      : "";
    return `<svg viewBox="0 0 220 110" preserveAspectRatio="none" ${graph}><path d="${area}" fill="url(#solarFill)" opacity=".55" stroke="none"/><path d="${line}" fill="none" stroke="var(--amber)" stroke-width="1.2" vector-effect="non-scaling-stroke"/><text x="4" y="96" fill="var(--muted)" font-size="7">${escapeHtml(
      t("solar.battery").toLocaleUpperCase(),
    )} ${formatNumber(soc, 0, language)} %</text></svg>`;
  }

  if (key === "vand") {
    const salt = clamp(model.water?.salt ?? 0, 0, 100);
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><rect x="0" y="38" width="220" height="2" fill="var(--line)"/><rect x="0" y="36" width="${(salt / 100) * 220}" height="6" rx="3" fill="var(--sky)" opacity=".8"/><text x="4" y="24" fill="var(--muted)" font-size="8">${escapeHtml(
      t("water.salt").toLocaleUpperCase(),
    )} ${formatNumber(salt, 0, language)} %</text></svg>`;
  }

  if (key === "sikkerhed") {
    const openings =
      model.security?.openings ?? model.rooms.flatMap((room) => room.openings);
    return `<div class="${c("sec-dots")}">${openings
      .map(
        (opening) =>
          `<i class="${isOn(opening.id) ? "open" : ""}" title="${escapeHtml(
            opening.name,
          )}"></i>`,
      )
      .join("")}</div>`;
  }

  if (key === "ventilation") {
    const system = model.systemCards.find((card) => card.id === "ventilation");
    const step =
      model.ventilation?.step ?? numberFromState(system?.step?.state) ?? 0;
    return `<div class="${c("zone-strip")}">${[0, 1, 2, 3, 4]
      .map(
        (index) =>
          `<i style="height:${20 + index * 16}%;opacity:${
            index <= step ? 0.85 : 0.25
          }"></i>`,
      )
      .join("")}</div>`;
  }

  if (key === "teknik") {
    const id = context.config.network?.router;
    const history =
      id && context.history ? context.history.series(id, { fill: "hold" }) : [];
    const values = history.length ? history : [model.tech?.router ?? null];
    const now = context.now ?? new Date();
    const end = now.getTime();
    const graph =
      values.length > 1
        ? graphAttrs({
            start: end - 86_400_000,
            end,
            unit: "ms",
            decimals: 0,
            series: [{ values }],
          })
        : "";
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none" ${graph}><path d="${sparkPath(
      values,
      220,
      52,
      2,
    )}" fill="none" stroke="var(--sky)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  if (key === "oekonomi") {
    const id = context.config.economy?.bond;
    const history =
      id && context.history ? context.history.series(id, { fill: "hold" }) : [];
    const values = history.length ? history : [model.economy?.value ?? null];
    const now = context.now ?? new Date();
    const end = now.getTime();
    const graph =
      values.length > 1
        ? graphAttrs({
            start: end - 86_400_000,
            end,
            unit: "",
            decimals: 2,
            series: [{ values }],
          })
        : "";
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none" ${graph}><path d="${sparkPath(
      values,
      220,
      52,
      2,
    )}" fill="none" stroke="var(--brass)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  if (key === "lys") {
    const ids = allLightIds(model.lights);
    return `<div class="${c("light-dots")}">${ids
      .map((id) => `<i class="${isOn(id) ? "on" : ""}"></i>`)
      .join("")}</div>`;
  }

  if (key === "varme") {
    const zones = [...model.heating, ...model.heatingReserve];
    return `<div class="${c("zone-strip")}">${zones
      .map((zone) => {
        const current = numberFromState(
          zone.entity.attributes?.current_temperature,
        );
        const target = numberFromState(zone.entity.attributes?.temperature);
        const height = clamp(40 + ((current ?? 21) - 19) * 14, 20, 96);
        const warn =
          current !== null && target !== null && current < target - 0.5;
        return `<i class="${warn ? "warn" : ""}" style="height:${height}%" title="${escapeHtml(
          zone.name,
        )}"></i>`;
      })
      .join("")}</div>`;
  }

  if (key === "alarmer") {
    const hasAlerts = model.alerts.length > 0;
    return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="M0 30 C 20 30, 24 30, 30 30 S 36 12, 44 30 S 52 42, 60 30 S 68 8, 76 30 S 86 36, 94 30 S 104 18, 112 30 S 122 30, 130 30 S 140 10, 148 30 S 158 40, 166 30 S 176 20, 184 30 S 200 30, 220 30" fill="none" stroke="${
      hasAlerts ? "var(--coral)" : "var(--sage)"
    }" stroke-width="1.1" opacity=".7"/></svg>`;
  }

  return "";
}

function allLightIds(groups: LightGroupModel[]): string[] {
  const out: string[] = [];
  const add = (id: string) => {
    if (id && !out.includes(id)) out.push(id);
  };
  for (const group of groups) {
    if (group.members.length) {
      for (const member of group.members) add(member);
    } else {
      add(group.entityId);
    }
    for (const extra of group.extra) add(extra);
  }
  return out;
}

function languageOf(config: ArcusConfig, t: Translator): string {
  if (config.language === "da" || config.language === "en") {
    return config.language;
  }
  return t("common.today") === "I dag" ? "da" : "en";
}

function dayFraction(date: Date): number {
  return (
    (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / 1440
  );
}
