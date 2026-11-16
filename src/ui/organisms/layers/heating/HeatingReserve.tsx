import type {
  ArcusHass,
  HeatingReserveModel,
  Language,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { c } from "../../../styles/classes";
import { heatingReading } from "./heating-state";
import { HeatingReserveRow } from "./HeatingReserveRow";

export interface HeatingReserveProps {
  reserve: HeatingReserveModel[];
  hass: ArcusHass;
  language: Language;
  unit: TemperatureUnit;
  t: Translator;
  onSetpoint: (entityId: string, value: number) => void;
}

/** The optional extra reserve-channel block. */
export const HeatingReserve = ({
  reserve,
  hass,
  language,
  unit,
  t,
  onSetpoint,
}: HeatingReserveProps) => {
  if (!reserve.length) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("heating.reserve")}</div>
      <div className={c("list")}>
        {reserve.map((zone) => (
          <HeatingReserveRow
            key={zone.entity.entityId}
            zone={zone}
            reading={heatingReading(hass, zone.entity)}
            language={language}
            unit={unit}
            t={t}
            onSetpoint={(next) => onSetpoint(zone.entity.entityId, next)}
          />
        ))}
      </div>
    </div>
  );
};
