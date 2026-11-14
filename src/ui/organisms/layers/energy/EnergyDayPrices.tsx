import { priceColor } from "../../../../render/charts";
import { graphAttrs } from "../../../../render/graph";
import type { PriceModel, Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

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
  currency: string;
}

/**
 * The day's price curve. Bars are plain `<i>` elements, exactly like the
 * legacy sheet, and carry the same `data-graph` attributes so the card's
 * hover readout can parse the plotted values back out.
 */
function PriceBars({ price, now, t, currency }: PriceBarsProps) {
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
      unit: currency,
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

interface EnergyDayPricesProps {
  price: PriceModel;
  now: Date;
  t: Translator;
  currency: string;
}

/** The nested "day prices" block with its 24-hour bar chart. */
export function EnergyDayPrices({
  price,
  now,
  t,
  currency,
}: EnergyDayPricesProps) {
  return (
    <div className={c("block")} style={{ marginTop: 18 }}>
      <div className={c("block-label")}>{t("energy.dayPrices")}</div>
      <PriceBars price={price} now={now} t={t} currency={currency} />
    </div>
  );
}
