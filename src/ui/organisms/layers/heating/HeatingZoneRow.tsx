import type {
  HeatingModel,
  Language,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { c } from "../../../styles/classes";
import { temperature } from "./helpers";
import type { HeatingReading } from "./heating-state";
import { Setpoint } from "./Setpoint";

export interface HeatingZoneRowProps {
  zone: HeatingModel;
  reading: HeatingReading;
  activity: string;
  opening: boolean;
  language: Language;
  unit: TemperatureUnit;
  t: Translator;
  onSetpoint: (value: number) => void;
  onToggle: () => void;
}

/** One discovered climate zone with its setpoint and hvac toggle. */
export function HeatingZoneRow({
  zone,
  reading,
  activity,
  opening,
  language,
  unit,
  t,
  onSetpoint,
  onToggle,
}: HeatingZoneRowProps) {
  const entityId = zone.entity.entityId;

  return (
    <div className={c("row")}>
      <div className={c("row-main")}>
        <div className={c("row-name")}>
          {zone.name}
          {opening ? (
            <span
              className={c("status-line")}
              style={{ display: "inline-flex", marginLeft: 6 }}
            >
              <i className={c("dot warn")} />
            </span>
          ) : null}
        </div>
        <div className={c("row-sub")}>
          {t("room.heatingNow", {
            temp: temperature(reading.current, language, unit),
          })}{" "}
          · {activity}
          {opening ? ` · ${t("heating.windowOpen")}` : ""}
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
      <button
        type="button"
        className={c("toggle", reading.on && "on")}
        data-act="hvac-toggle"
        data-entity={entityId}
        data-on={entityId}
        aria-label={`${t("common.toggle")} ${zone.name}`}
        aria-pressed={reading.on}
        onClick={onToggle}
      />
    </div>
  );
}
