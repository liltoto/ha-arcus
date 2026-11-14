import { formatNumber } from "../../../../format";
import type { Language, TemperatureUnit, Translator } from "../../../../types";
import { Stepper } from "../../../molecules/Stepper";
import { c } from "../../../styles/classes";

interface SetpointProps {
  entityId: string;
  value: number | null;
  min: number;
  max: number;
  label: string;
  language: Language;
  unit: TemperatureUnit;
  t: Translator;
  dataAct: string;
  onChange: (value: number) => void;
}

/** One setpoint stepper carrying the legacy temp-step/input-step hooks. */
export function Setpoint({
  entityId,
  value,
  min,
  max,
  label,
  language,
  unit,
  t,
  dataAct,
  onChange,
}: SetpointProps) {
  if (value === null) return <span className={c("row-val")}>–</span>;
  return (
    <span
      data-act={dataAct}
      data-entity={entityId}
      data-step={0.5}
      style={{ display: "contents" }}
    >
      <Stepper
        value={value}
        min={min}
        max={max}
        step={0.5}
        unit={unit === "°F" ? "°F" : "°"}
        label={label}
        t={t}
        formatValue={(next) => formatNumber(next, 1, language)}
        onChange={onChange}
      />
    </span>
  );
}
