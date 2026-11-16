import type { Language, TechModel, Translator } from "../../../../types";
import { ListRow } from "../../../molecules/ListRow";
import { c } from "../../../styles/classes";
import { hoursUnit, uptimeHours, type TechFormat } from "./tech-view";

interface TechInverterProps {
  tech: TechModel;
  fmt: TechFormat;
  t: Translator;
  language: Language;
}

/** Inverter and datalogger details from the solar install. */
export const TechInverter = ({ tech, fmt, t, language }: TechInverterProps) => {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("tech.inverter")}</div>
      <div className={c("list")}>
        <ListRow
          name={t("tech.wifi")}
          icon="network"
          value={fmt(tech.wifiSignal, 0)}
          unit="dBm"
        />
        <ListRow
          name={t("tech.uptime")}
          icon="clock"
          trailing={
            <span className={c("row-val")} style={{ fontSize: 13 }}>
              {uptimeHours(tech.uptime)}
              <small>{hoursUnit(language)}</small>
            </span>
          }
        />
        <ListRow
          name={t("tech.pulseTemp")}
          icon="thermometer"
          value={fmt(tech.temperature, 1)}
          unit="°C"
        />
        <ListRow
          name={t("tech.frequency")}
          icon="bolt"
          value={fmt(tech.frequency, 2)}
          unit="Hz"
        />
        <ListRow
          name={t("tech.model")}
          icon="info"
          trailing={
            <span className={c("row-val")} style={{ fontSize: 11 }}>
              {tech.inverterModel || "–"}
            </span>
          }
        />
        <ListRow
          name={t("tech.datalogger")}
          icon="info"
          trailing={
            <span className={c("row-val")} style={{ fontSize: 11 }}>
              {tech.dataloggerVersion || "–"}
            </span>
          }
        />
      </div>
    </div>
  );
};
