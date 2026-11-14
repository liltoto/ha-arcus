import type { TechModel, Translator } from "../../../../types";
import { ListRow } from "../../../molecules/ListRow";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import type { TechFormat, TechStatus } from "./tech-view";

interface TechReadingsProps {
  tech: TechModel;
  fmt: TechFormat;
  t: Translator;
}

/** The four-cell latency grid above the pulse chart. */
export function TechReadings({ tech, fmt, t }: TechReadingsProps) {
  return (
    <div className={c("readings")}>
      <Readout label={t("tech.router")} value={fmt(tech.router, 1)} unit="ms" />
      <Readout label={t("tech.google")} value={fmt(tech.google, 1)} unit="ms" />
      <Readout
        label={t("tech.cloudflare")}
        value={fmt(tech.cloudflare, 1)}
        unit="ms"
      />
      <Readout
        label={t("tech.packetLoss")}
        value={fmt(tech.packetLoss, 1)}
        unit="%"
      />
    </div>
  );
}

interface TechQualityProps {
  tech: TechModel;
  fmt: TechFormat;
  t: Translator;
  status: TechStatus;
}

/** Jitter, packet loss and the probe endpoints below the pulse chart. */
export function TechQuality({ tech, fmt, t, status }: TechQualityProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("tech.quality")}</div>
      <div className={c("list")}>
        <ListRow
          name={t("tech.router")}
          sub={status.text}
          icon="network"
          trailing={
            <span className={c("status-line")}>
              <i className={c("dot", status.warn && "warn")} />
              {status.label}
            </span>
          }
        />
        <ListRow
          name={t("tech.jitter")}
          sub={t("tech.router")}
          icon="wind"
          value={fmt(tech.jitter, 2)}
          unit="ms"
        />
        <ListRow
          name={t("tech.packetLoss7d")}
          icon="alert"
          value={fmt(tech.packetLoss7d, 2)}
          unit="%"
        />
        <ListRow
          name={t("tech.google")}
          sub="8.8.8.8"
          icon="network"
          value={fmt(tech.google, 1)}
          unit="ms"
        />
        <ListRow
          name={t("tech.cloudflare")}
          sub="1.1.1.1"
          icon="network"
          value={fmt(tech.cloudflare, 1)}
          unit="ms"
        />
      </div>
    </div>
  );
}
