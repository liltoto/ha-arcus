import { formatNumber } from "../../../format";
import { EmptyState } from "../../atoms/EmptyState";
import { useHistoryFrame } from "../../hooks/useLayerFrame";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";
import { TechInverter } from "./tech/TechInverter";
import { TechQuality, TechReadings } from "./tech/TechLatency";
import { TechPulse } from "./tech/TechPulse";
import { seriesOf, techStatus, type TechFormat } from "./tech/tech-view";

const SHEET_STYLE = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  minHeight: 0,
} as const;

/**
 * Tech: router/Google/Cloudflare latency, packet loss, jitter and the
 * inverter/datalogger details, ported from `views/layers/tech.ts`. The 6-hour
 * pulse is rendered from the history cache rather than left for the card to
 * fill in later.
 */
export const TechBody = (_props: LayerBodyProps) => {
  const { model, config, history, t, now, actions } = useHistoryFrame();

  const language = model.language;
  const fmt: TechFormat = (value, digits = 1) =>
    formatNumber(value, digits, language);
  const tech = model.tech;

  if (!tech) {
    return (
      <div data-react-layer style={SHEET_STYLE}>
        <SheetHeader
          kicker={t("sheet.kickerTech")}
          title={t("sheet.titleTech")}
          sum="–"
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className={c("sheet-scroll")}>
          <EmptyState icon="network" title={t("empty.data")} />
        </div>
      </div>
    );
  }

  const status = techStatus(t, tech.routerOnline);
  const nowMs = now().getTime();

  return (
    <div data-react-layer style={SHEET_STYLE}>
      <SheetHeader
        kicker={t("sheet.kickerTech")}
        title={t("sheet.titleTech")}
        sum={t("tech.summary", {
          router: fmt(tech.router, 1),
          google: fmt(tech.google, 1),
          loss: fmt(tech.packetLoss7d, 2),
        })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <TechReadings tech={tech} fmt={fmt} t={t} />
        <TechPulse
          t={t}
          nowMs={nowMs}
          router={seriesOf(history, config.network?.router)}
          google={seriesOf(history, config.network?.google)}
          cloudflare={seriesOf(history, config.network?.cloudflare)}
        />
        <TechQuality tech={tech} fmt={fmt} t={t} status={status} />
        <TechInverter tech={tech} fmt={fmt} t={t} language={language} />
        <div className={c("note")}>{t("tech.footer")}</div>
      </div>
    </div>
  );
};
