import type {
  ArcusHass,
  HeatingModel,
  Language,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { EmptyState } from "../../../atoms/EmptyState";
import { ZoneStrip } from "../../../molecules/ZoneStrip";
import { c } from "../../../styles/classes";
import { activityFor, isOpeningOn, type HeatingStrip } from "./helpers";
import { heatingReading } from "./heating-state";
import { HeatingZoneRow } from "./HeatingZoneRow";

export interface HeatingZonesProps {
  zones: HeatingModel[];
  strip: HeatingStrip;
  hass: ArcusHass;
  language: Language;
  unit: TemperatureUnit;
  t: Translator;
  onSetpoint: (entityId: string, value: number) => void;
  onToggle: (zone: HeatingModel) => void;
}

/** The main zones block with the zone strip and the empty fallback. */
export function HeatingZones({
  zones,
  strip,
  hass,
  language,
  unit,
  t,
  onSetpoint,
  onToggle,
}: HeatingZonesProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("heating.zones")}</div>
        <div style={{ width: 120, height: 26 }}>
          <ZoneStrip values={strip.values} warns={strip.warns} />
        </div>
      </div>
      <div className={c("list")}>
        {zones.length ? (
          zones.map((zone) => {
            const reading = heatingReading(hass, zone.entity);
            return (
              <HeatingZoneRow
                key={zone.entity.entityId}
                zone={zone}
                reading={reading}
                activity={activityFor(reading, t)}
                opening={isOpeningOn(hass, zone.opening ?? null)}
                language={language}
                unit={unit}
                t={t}
                onSetpoint={(next) => onSetpoint(zone.entity.entityId, next)}
                onToggle={() => onToggle(zone)}
              />
            );
          })
        ) : (
          <EmptyState icon="heat" title={t("empty.dataYet")} />
        )}
      </div>
    </div>
  );
}
