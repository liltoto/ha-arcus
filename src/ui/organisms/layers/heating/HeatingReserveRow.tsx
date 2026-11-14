import type {
  HeatingReserveModel,
  Language,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { c } from "../../../styles/classes";
import { temperature } from "./helpers";
import type { HeatingReading } from "./heating-state";
import { Setpoint } from "./Setpoint";

export interface HeatingReserveRowProps {
  zone: HeatingReserveModel;
  reading: HeatingReading;
  language: Language;
  unit: TemperatureUnit;
  t: Translator;
  onSetpoint: (value: number) => void;
}

/** One extra Wavin reserve channel with only a setpoint. */
export function HeatingReserveRow({
  zone,
  reading,
  language,
  unit,
  t,
  onSetpoint,
}: HeatingReserveRowProps) {
  const entityId = zone.entity.entityId;

  return (
    <div className={c("row")}>
      <div className={c("row-main")}>
        <div className={c("row-name")}>{zone.name}</div>
        <div className={c("row-sub")}>
          {t("room.heatingNow", {
            temp: temperature(reading.current, language, unit),
          })}
        </div>
      </div>
      <Setpoint
        entityId={entityId}
        value={reading.target}
        min={reading.min}
        max={reading.max}
        label={zone.name}
        language={language}
        unit={unit}
        dataAct="temp-step"
        onChange={onSetpoint}
      />
    </div>
  );
}
