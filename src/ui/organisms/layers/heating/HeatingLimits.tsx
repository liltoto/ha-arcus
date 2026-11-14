import { numberFrom } from "../../../../format";
import type {
  ArcusHass,
  EntityRef,
  Language,
  TemperatureUnit,
  Translator,
} from "../../../../types";
import { c } from "../../../styles/classes";
import { refNumber, type HeatingLimitsConfig } from "./helpers";
import { liveAttributes } from "./heating-state";
import { Setpoint } from "./Setpoint";

interface LimitRowProps {
  entity: EntityRef;
  label: string;
  sub: string;
  hass: ArcusHass;
  language: Language;
  unit: TemperatureUnit;
  onChange: (entityId: string, value: number) => void;
}

/** One limit entity row, bounded by its own min/max attributes. */
function LimitRow({
  entity,
  label,
  sub,
  hass,
  language,
  unit,
  onChange,
}: LimitRowProps) {
  const attributes = liveAttributes(hass, entity);
  const value = refNumber(hass, entity);
  const min = numberFrom(attributes.min) ?? 5;
  const max = numberFrom(attributes.max) ?? 35;

  return (
    <div className={c("row")}>
      <div className={c("row-main")}>
        <div className={c("row-name")}>{label}</div>
        <div className={c("row-sub")}>{sub}</div>
      </div>
      <Setpoint
        entityId={entity.entityId}
        value={value}
        min={min}
        max={max}
        label={label}
        language={language}
        unit={unit}
        dataAct="input-step"
        onChange={(next) => onChange(entity.entityId, next)}
      />
    </div>
  );
}

export interface HeatingLimitsProps {
  limits?: HeatingLimitsConfig;
  hass: ArcusHass;
  language: Language;
  unit: TemperatureUnit;
  t: Translator;
  onChange: (entityId: string, value: number) => void;
}

/** The standard/reduced setpoint limits configured outside the home model. */
export function HeatingLimits({
  limits,
  hass,
  language,
  unit,
  t,
  onChange,
}: HeatingLimitsProps) {
  if (!limits || (!limits.standard && !limits.reduced)) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("heating.limits")}</div>
      <div className={c("list")}>
        {limits.standard ? (
          <LimitRow
            entity={limits.standard}
            label={t("heating.standard")}
            sub={t("heating.standardSub")}
            hass={hass}
            language={language}
            unit={unit}
            onChange={onChange}
          />
        ) : null}
        {limits.reduced ? (
          <LimitRow
            entity={limits.reduced}
            label={t("heating.reduced")}
            sub={t("heating.reducedSub")}
            hass={hass}
            language={language}
            unit={unit}
            onChange={onChange}
          />
        ) : null}
      </div>
    </div>
  );
}
