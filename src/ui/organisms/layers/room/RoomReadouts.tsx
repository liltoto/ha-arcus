import { formatNumber } from "../../../../format";
import type { Language, TemperatureUnit, Translator } from "../../../../types";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import type { RoomView } from "./room-view";

export interface RoomReadoutsProps {
  view: RoomView;
  t: Translator;
  language: Language;
  tempUnit: TemperatureUnit;
}

/** The four headline readouts above the room charts. */
export function RoomReadouts({
  view,
  t,
  language,
  tempUnit,
}: RoomReadoutsProps) {
  const { temp, humidity, co2, pm25 } = view;
  return (
    <div className={c("readings")}>
      <Readout
        label={t("room.temperature")}
        value={formatNumber(temp, 1, language)}
        unit={tempUnit}
      />
      <Readout
        label={t("room.humidity")}
        value={humidity === null ? "–" : String(Math.round(humidity))}
        unit="%"
      />
      <Readout
        label={t("room.co2")}
        value={co2 === null ? "–" : String(Math.round(co2))}
        unit="ppm"
      />
      <Readout
        label={t("room.pm25")}
        value={pm25 === null ? "–" : formatNumber(pm25, 1, language)}
        unit="µg/m³"
      />
    </div>
  );
}
