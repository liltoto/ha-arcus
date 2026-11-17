import type { CSSProperties } from "react";
import { rangePeriodLabel, type ResolvedHistoryRange } from "../../../../range";
import type { Language, Translator } from "../../../../types";
import type { ChartState } from "../../../molecules/ChartBox";
import { HistoryChart } from "../../../molecules/HistoryChart";
import { c } from "../../../styles/classes";

export interface TechPulseProps {
  t: Translator;
  language: Language;
  range: ResolvedHistoryRange;
  now: () => Date;
  state: ChartState;
  router: Array<number | null>;
  google: Array<number | null>;
  cloudflare: Array<number | null>;
}

/**
 * The pulse chart: one held history series per network probe, drawn by the
 * shared history chart so the card's hover readout keeps working. The chart
 * follows the card-wide window; the readings above stay live.
 */
export const TechPulse = ({
  t,
  language,
  range,
  now,
  state,
  router,
  google,
  cloudflare,
}: TechPulseProps) => {
  const title = t("chart.period", {
    label: t("tech.pulse"),
    period: rangePeriodLabel(range, t, language, now()),
  });

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{title}</div>
        <div className={c("legend")}>
          <span>
            <i style={{ "--c": "var(--sky)" } as CSSProperties} />
            {t("tech.router")}
          </span>
          <span>
            <i style={{ "--c": "var(--sage)" } as CSSProperties} />
            {t("tech.google")}
          </span>
          <span>
            <i style={{ "--c": "var(--plum)" } as CSSProperties} />
            {t("tech.cloudflare")}
          </span>
        </div>
      </div>
      <HistoryChart
        series={[
          {
            values: router,
            color: "var(--sky)",
            label: t("tech.router"),
          },
          {
            values: google,
            color: "var(--sage)",
            label: t("tech.google"),
          },
          {
            values: cloudflare,
            color: "var(--plum)",
            label: t("tech.cloudflare"),
          },
        ]}
        t={t}
        start={range.start}
        end={range.end}
        unit="ms"
        decimals={1}
        idPrefix="tech-chart"
        state={state}
      />
    </div>
  );
};
