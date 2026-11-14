import { Icon } from "../atoms/Icon";

export interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function decimalPlaces(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function roundToStep(value: number, step: number): number {
  const factor = 10 ** Math.min(4, decimalPlaces(step));
  return Math.round(value * factor) / factor;
}

/**
 * The thermostat/target stepper. Bounds are inclusive and the buttons disable
 * at the edges, so the page never has to guard against an out-of-range value.
 */
export function Stepper({
  value,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  unit,
  label,
  onChange,
  formatValue,
}: StepperProps) {
  const atMin = Number.isFinite(min) && value <= min;
  const atMax = Number.isFinite(max) && value >= max;
  const display = formatValue
    ? formatValue(value)
    : String(roundToStep(value, step));

  const move = (direction: -1 | 1) => {
    const next = roundToStep(
      Math.min(max, Math.max(min, value + direction * step)),
      step,
    );
    onChange(next);
  };

  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={label ? `Decrease ${label}` : "Decrease"}
        disabled={atMin}
        onClick={() => move(-1)}
      >
        <Icon name="minus" />
      </button>
      <span className="val">
        {display}
        {unit ? <small>{unit}</small> : null}
      </span>
      <button
        type="button"
        aria-label={label ? `Increase ${label}` : "Increase"}
        disabled={atMax}
        onClick={() => move(1)}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}
