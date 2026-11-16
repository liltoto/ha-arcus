import type { CSSProperties } from "react";
import type { Translator } from "../../../../types";
import { HistoryChart } from "../../../molecules/HistoryChart";
import { c } from "../../../styles/classes";

export interface TechPulseProps {
  t: Translator;
  nowMs: number;
  router: Array<number | null>;
  google: Array<number | null>;
  cloudflare: Array<number | null>;
}

/**
 * The pulse chart: one held history series per network probe, drawn by the
 * shared history chart so the card's hover readout keeps working.
 */
export const TechPulse = ({
  t,
  nowMs,
  router,
  google,
  cloudflare,
}: TechPulseProps) => {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("tech.pulse")}</div>
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
        nowMs={nowMs}
        windowMs={86_400_000}
        unit="ms"
        decimals={1}
        idPrefix="tech-chart"
      />
    </div>
  );
};
