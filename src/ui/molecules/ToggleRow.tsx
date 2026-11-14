import { Icon } from "../atoms/Icon";
import { c } from "../styles/classes";

export interface ToggleRowProps {
  label: string;
  sub?: string;
  isOn: boolean;
  onChange: () => void;
  icon?: string;
  disabled?: boolean;
  dataAct?: string;
  dataEntity?: string;
}

/**
 * A label plus the legacy pill toggle used throughout the sheets. The whole
 * row is one button so the label and the switch share a single hit target.
 */
export function ToggleRow({
  label,
  sub,
  isOn,
  onChange,
  icon,
  disabled,
  dataAct = "toggle-switch",
  dataEntity,
}: ToggleRowProps) {
  return (
    <button
      type="button"
      className={c("row", "row-button", isOn && "on")}
      aria-pressed={isOn}
      aria-label={label}
      data-act={dataAct}
      data-entity={dataEntity}
      disabled={disabled}
      onClick={onChange}
    >
      {icon ? <Icon name={icon} /> : null}
      <span className={c("row-main")}>
        <span className={c("row-name")}>{label}</span>
        {sub ? <span className={c("row-sub")}>{sub}</span> : null}
      </span>
      <span className={c("toggle", isOn && "on")} aria-hidden="true" />
    </button>
  );
}
