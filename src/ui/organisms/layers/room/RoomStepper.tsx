import type { Language } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

export interface RoomStepperProps {
  entityId: string;
  value: string;
  language: Language;
  onStep: (direction: -1 | 1) => void;
}

/** The thermostat stepper, with the legacy data hooks intact. */
export function RoomStepper({
  entityId,
  value,
  language,
  onStep,
}: RoomStepperProps) {
  const down = language === "da" ? "Ned" : "Down";
  const up = language === "da" ? "Op" : "Up";

  return (
    <div className={c("stepper")}>
      <button
        type="button"
        data-act="temp-step"
        data-entity={entityId}
        data-step={0.5}
        data-dir="-1"
        aria-label={down}
        onClick={() => onStep(-1)}
      >
        <Icon name="minus" />
      </button>
      <span className={c("val")}>{value}</span>
      <button
        type="button"
        data-act="temp-step"
        data-entity={entityId}
        data-step={0.5}
        data-dir="1"
        aria-label={up}
        onClick={() => onStep(1)}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}
