import { formatNumber } from "../../../../format";
import type {
  Language,
  RoomModel,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import type { RoomView } from "./room-view";

export interface RoomReadoutsProps {
  room: RoomModel;
  view: RoomView;
  t: Translator;
  language: Language;
  tempUnit: TemperatureUnit;
}

/**
 * The headline readouts above the room charts. Only sensors the room model
 * actually has get a tile; a sensor that exists but is temporarily
 * unavailable keeps its tile and shows a dash.
 */
export const RoomReadouts = ({
  room,
  view,
  t,
  language,
  tempUnit,
}: RoomReadoutsProps) => {
  const { temp, humidity, co2, pm25 } = view;
  return (
    <div className={c("readings")}>
      <Readout
        label={t("room.temperature")}
        value={formatNumber(temp, 1, language)}
        unit={tempUnit}
      />
      {room.humidity ? (
        <Readout
          label={t("room.humidity")}
          value={humidity === null ? "–" : String(Math.round(humidity))}
          unit="%"
        />
      ) : null}
      {room.co2 ? (
        <Readout
          label={t("room.co2")}
          value={co2 === null ? "–" : String(Math.round(co2))}
          unit="ppm"
        />
      ) : null}
      {room.pm25 ? (
        <Readout
          label={t("room.pm25")}
          value={pm25 === null ? "–" : formatNumber(pm25, 1, language)}
          unit="µg/m³"
        />
      ) : null}
    </div>
  );
};
