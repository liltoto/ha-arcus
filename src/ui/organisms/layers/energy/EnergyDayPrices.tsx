import type { HistoryCache } from "../../../../data/history";
import { priceColor } from "../../../../render/charts";
import { graphAttrs } from "../../../../render/graph";
import { startOfDay, type ResolvedHistoryRange } from "../../../../range";
import type { PriceModel, Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

/**
 * `graphAttrs()` returns a string because the legacy renderer injected it into
 * template HTML. React needs individual props, so decode the small, fixed set
 * of `data-g*` attributes back into an object.
 */
const graphProps = (attrs: string): Record<string, string> => {
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
};

/**
 * Live days use the model curve (it may carry today and tomorrow); a past day
 * is read back from the recorder for exactly the selected window.
 */
const priceValues = (
  price: PriceModel,
  history: HistoryCache,
  range: ResolvedHistoryRange,
  priceEntity: string | undefined,
  dayStart: number,
  dayEnd: number,
): Array<number | null> => {
  if (range.live) return price.values ?? [];
  if (!priceEntity) return [];
  return history.series(priceEntity, {
    start: dayStart,
    end: dayEnd,
    buckets: 24,
    fill: null,
  });
};

/** Distinguish "still loading" and "recorder failed" from a purged day. */
const emptyPriceLabel = (
  history: HistoryCache,
  range: ResolvedHistoryRange,
  priceEntity: string | undefined,
  dayStart: number,
  dayEnd: number,
  t: Translator,
): string => {
  if (range.live || !priceEntity) return t("empty.chart");
  if (typeof history.rangeStatus !== "function") return t("empty.chart");
  const status = history.rangeStatus(priceEntity, dayStart, dayEnd);
  if (status === "failed") return t("empty.unavailable");
  if (status === "idle" || status === "loading") return t("empty.loading");
  return t("empty.chart");
};

interface PriceBarsProps {
  price: PriceModel;
  history: HistoryCache;
  range: ResolvedHistoryRange;
  priceEntity: string | undefined;
  now: Date;
  t: Translator;
  currency: string;
}

/**
 * The selected day's price curve. Bars are plain `<i>` elements, exactly like
 * the legacy sheet, and carry the same `data-graph` attributes so the card's
 * hover readout can parse the plotted values back out.
 */
const PriceBars = ({
  price,
  history,
  range,
  priceEntity,
  now,
  t,
  currency,
}: PriceBarsProps) => {
  // The price curve is always one calendar day: the anchor day, even when the
  // sheet's other charts follow a 7- or 30-day window.
  const dayStart = startOfDay(range.end - 1);
  const dayEnd = range.end;
  const values = priceValues(
    price,
    history,
    range,
    priceEntity,
    dayStart,
    dayEnd,
  );
  const finite = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (!values.length || !finite.length) {
    return (
      <div className={c("empty")}>
        <Icon name="chart" />
        <span>
          {emptyPriceLabel(history, range, priceEntity, dayStart, dayEnd, t)}
        </span>
      </div>
    );
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  // Only a one-day live window has an hour slot that maps onto the bars.
  const nowHour = range.live ? now.getHours() : -1;
  const graph = graphProps(
    graphAttrs({
      mode: "bars",
      start: dayStart,
      end: dayEnd,
      unit: currency,
      decimals: 2,
      series: [{ values }],
    }),
  );

  return (
    <>
      <div className={c("bar-chart")} {...graph}>
        {values.map((value, index) => {
          const height =
            value === null
              ? 8
              : Math.max(8, ((value - min) / (max - min || 1)) * 100);
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
};

interface EnergyDayPricesProps {
  price: PriceModel;
  history: HistoryCache;
  range: ResolvedHistoryRange;
  priceEntity: string | undefined;
  now: Date;
  t: Translator;
  currency: string;
}

/** The nested "day prices" block with its 24-hour bar chart. */
export const EnergyDayPrices = ({
  price,
  history,
  range,
  priceEntity,
  now,
  t,
  currency,
}: EnergyDayPricesProps) => {
  return (
    <div className={c("block")} style={{ marginTop: 18 }}>
      <div className={c("block-label")}>{t("energy.dayPrices")}</div>
      <PriceBars
        price={price}
        history={history}
        range={range}
        priceEntity={priceEntity}
        now={now}
        t={t}
        currency={currency}
      />
    </div>
  );
};
