import { Icon } from "../atoms/Icon";

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
    <div className={`row${isOn ? " on" : ""}`}>
      {icon ? <Icon name={icon} /> : null}
      <div className="row-main">
        <div className="row-name">{label}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
      </div>
      <button
        type="button"
        className={`toggle${isOn ? " on" : ""}`}
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
