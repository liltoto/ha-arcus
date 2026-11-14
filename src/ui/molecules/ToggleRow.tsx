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

/** A label plus the legacy pill toggle used throughout the sheets. */
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
    <div className={c("row", isOn && "on")}>
      {icon ? <Icon name={icon} /> : null}
      <div className={c("row-main")}>
        <div className={c("row-name")}>{label}</div>
        {sub ? <div className={c("row-sub")}>{sub}</div> : null}
      </div>
      <button
        type="button"
        className={c("toggle", isOn && "on")}
        aria-pressed={isOn}
        aria-label={label}
        data-act={dataAct}
        data-entity={dataEntity}
        disabled={disabled}
        onClick={onChange}
      />
    </div>
  );
}
