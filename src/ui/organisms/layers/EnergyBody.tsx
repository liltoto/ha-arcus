import { priceColor } from "../../../render/charts";
import { graphAttrs } from "../../../render/graph";
import { formatPrice } from "../../../format";
import type { HistoryCache } from "../../../data/history";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  Language,
  PriceModel,
  Translator,
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
import { Icon } from "../../atoms/Icon";
import { ListRow } from "../../molecules/ListRow";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";

function languageOf(
  model: HomeModel,
  config: ArcusConfig,
  t: Translator,
): Language {
  const modelLanguage = (model as { language?: unknown }).language;
  if (modelLanguage === "da" || modelLanguage === "en") return modelLanguage;
  if (config.language === "da" || config.language === "en") {
    return config.language;
  }
  return t("common.today") === "I dag" ? "da" : "en";
}

function nowOf(now: () => Date): Date {
  try {
    const value = now();
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    /* fall through to the wall clock */
  }
  return new Date();
}

function hourLabel(hour: number): string {
  return String(Math.trunc(hour)).padStart(2, "0");
}

function stateNumber(hass: ArcusHass, entityId: string): number | null {
  const raw = hass.states?.[entityId]?.state;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim()) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

/**
 * The legacy card exposed `_n()` to the string sheets. The React tree reads the
 * same live states from `hass`; the history cache is the last resort when a
 * configured price sensor has dropped out of the state machine.
 */
function liveNumber(
  hass: ArcusHass,
  history: HistoryCache,
  entityId: string | undefined,
  fallback: number | null,
): number | null {
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
}

function liveOn(
  hass: ArcusHass,
  entityId: string | undefined,
  fallback: boolean | undefined,
): boolean {
  if (typeof fallback === "boolean") return fallback;
  if (!entityId) return false;
  const state = hass.states?.[entityId]?.state;
  return state === "on" || state === "open";
}

function priceSection(model: HomeModel): PriceModel | undefined {
  const price = model.price;
  const energy = model.energy;
  if (price && Array.isArray(price.values) && price.values.length) {
    return price;
  }
  return energy ?? price;
}

/**
 * `graphAttrs()` returns a string because the legacy renderer injected it into
 * template HTML. React needs individual props, so decode the small, fixed set
 * of `data-g*` attributes back into an object.
 */
function graphProps(attrs: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const entry of attrs.match(/data-[a-z0-9-]+="[^"]*"/g) ?? []) {
    const equals = entry.indexOf("=");
    const name = entry.slice(0, equals);
    const raw = entry.slice(equals + 2, -1);
    props[name] = raw
      .replaceAll("&quot;", '"')
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
  }
  return props;
}

interface PriceBarsProps {
  price: PriceModel;
  now: Date;
  t: Translator;
}

/**
 * The day's price curve. Bars are plain `<i>` elements, exactly like the
 * legacy sheet, and carry the same `data-graph` attributes so the card's
 * hover readout can parse the plotted values back out.
 */
function PriceBars({ price, now, t }: PriceBarsProps) {
  const values = price.values ?? [];

  if (!values.length) {
    return (
      <div className={c("empty")}>
        <Icon name="chart" />
        <span>{t("empty.chart")}</span>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const nowHour = now.getHours();
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const graph = graphProps(
    graphAttrs({
      mode: "bars",
      start: dayStart,
      end: dayStart + 86_400_000,
      unit: "kr",
      decimals: 2,
      series: [{ values }],
    }),
  );

  return (
    <>
      <div className={c("bar-chart")} {...graph}>
        {values.map((value, index) => {
          const height = Math.max(8, ((value - min) / (max - min || 1)) * 100);
          return (
            <i
              key={index}
              className={c(index === nowHour && "now")}
              style={{
                height: `${height.toFixed(1)}%`,
                background: priceColor(value, min, max),
              }}
            />
          );
        })}
      </div>
      <div className={c("chart-cap")}>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </>
  );
}

/**
 * The energy sheet, ported from `views/layers/energy.ts`.
 *
 * It is built from the typed price model only: Tesla, standby, and appliance
 * readings have no typed model section or config entity mapping, so those
 * legacy blocks stay omitted until the config grows an energy section.
 */
export function EnergyBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow();
  const actions = useActions();

  const language = languageOf(model, config, t);
  const price = priceSection(model);
  const nowDate = nowOf(now);

  if (!price || !Array.isArray(price.values) || !price.values.length) {
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
          kicker={t("sheet.kickerEnergy")}
          title={t("sheet.titleEnergy")}
          sum={t("empty.data")}
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className={c("sheet-scroll")}>
          <div className={c("empty")}>
            <Icon name="bolt" />
            <span>{t("empty.data")}</span>
          </div>
        </div>
      </div>
    );
  }

  const nowHour = nowDate.getHours();
  const cheap = price.cheapest ?? null;
  const buy = price.buy ?? price.now;
  const sell = liveNumber(
    hass,
    history,
    config.price?.sell,
    price.sell ?? null,
  );
  const spot = liveNumber(
    hass,
    history,
    config.price?.spot,
    price.spot ?? null,
  );
  const next = liveNumber(
    hass,
    history,
    config.price?.next,
    price.next ?? (nowHour < 23 ? price.values[nowHour + 1] : null),
  );
  const lowest = liveNumber(
    hass,
    history,
    config.price?.lowest,
    price.lowest ?? price.min ?? null,
  );
  const highest = liveNumber(
    hass,
    history,
    config.price?.highest,
    price.highest ?? price.max ?? null,
  );
  const previous = liveNumber(
    hass,
    history,
    config.price?.previous,
    price.previous ?? (nowHour > 0 ? price.values[nowHour - 1] : null),
  );
  const tomorrow = liveOn(hass, config.price?.tomorrow, price.tomorrow);
  const cheapStart = cheap ? hourLabel(cheap.start) : "–";
  const cheapEnd = cheap ? hourLabel(cheap.end) : "–";
  const buyText = formatPrice(buy, language);
  const sellText = formatPrice(sell, language);
  const spotText = formatPrice(spot, language);
  const summary = cheap
    ? t("energy.summary", {
        price: buyText,
        start: cheapStart,
        end: cheapEnd,
      })
    : `${buyText} ${t("common.perKwh")}`;

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
        kicker={t("sheet.kickerEnergy")}
        title={t("sheet.titleEnergy")}
        sum={summary}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <div className={c("block")}>
          <div className={c("big-read")}>
            {buyText}
            <small>{t("common.perKwh")}</small>
          </div>
          <div className={c("block-note")}>
            {t("energy.nowNote", { sell: sellText, spot: spotText })}
          </div>
          <div className={c("block")} style={{ marginTop: 18 }}>
            <div className={c("block-label")}>{t("energy.dayPrices")}</div>
            <PriceBars price={price} now={nowDate} t={t} />
          </div>
          <div className={c("mini-grid")} style={{ marginTop: 12 }}>
            <div className={c("mini-stat")}>
              <div className={c("k")}>{t("energy.cheapest", { count: 3 })}</div>
              <div className={c("v")}>
                {formatPrice(cheap?.avg ?? null, language)}
                <small>{t("energy.kr")}</small>
              </div>
              <div className={c("row-sub")}>
                {cheap
                  ? t("energy.hourRange", {
                      start: cheapStart,
                      end: cheapEnd,
                    })
                  : "–"}
              </div>
            </div>
            <div className={c("mini-stat")}>
              <div className={c("k")}>{t("energy.tomorrow")}</div>
              <div className={c("v")} style={{ fontSize: 18 }}>
                {tomorrow
                  ? t("energy.tomorrowPublished")
                  : t("energy.tomorrowNotYet")}
              </div>
              <div className={c("row-sub")}>
                {tomorrow
                  ? t("energy.tomorrowSee")
                  : t("energy.tomorrowTypical")}
              </div>
            </div>
          </div>
        </div>
        <div className={c("block")}>
          <div className={c("block-label")}>{t("energy.pricesNow")}</div>
          <div className={c("readings")}>
            <Readout
              label={t("energy.buy")}
              value={buyText}
              unit={t("energy.kr")}
            />
            <Readout
              label={t("energy.sell")}
              value={sellText}
              unit={t("energy.kr")}
            />
            <Readout
              label={t("energy.spot")}
              value={spotText}
              unit={t("energy.kr")}
            />
            <Readout
              label={t("energy.nextHour")}
              value={formatPrice(next, language)}
              unit={t("energy.kr")}
            />
          </div>
        </div>
        <div className={c("block")}>
          <div className={c("block-head")}>
            <div className={c("block-label")}>{t("energy.todayPrices")}</div>
          </div>
          <div className={c("list")}>
            <ListRow
              icon="drop"
              name={t("energy.lowest")}
              sub={t("common.today")}
              value={formatPrice(lowest, language)}
              unit={t("energy.kr")}
            />
            <ListRow
              icon="flame"
              name={t("energy.highest")}
              sub={t("common.today")}
              value={formatPrice(highest, language)}
              unit={t("energy.kr")}
            />
            <ListRow
              icon="clock"
              name={t("energy.previousHour")}
              value={formatPrice(previous, language)}
              unit={t("energy.kr")}
            />
          </div>
        </div>
        <div className={c("btn-row")}>
          <button
            type="button"
            className={c("btn small")}
            data-nav="sol"
            onClick={() => actions.openSheet("sol")}
          >
            {t("sheet.titleSolar")}
          </button>
          <button
            type="button"
            className={c("btn small")}
            data-nav="vand"
            onClick={() => actions.openSheet("vand")}
          >
            {t("sheet.titleWater")}
          </button>
          <button
            type="button"
            className={c("btn small")}
            data-nav="teknik"
            onClick={() => actions.openSheet("teknik")}
          >
            {t("sheet.titleTech")}
          </button>
        </div>
      </div>
    </div>
  );
}
