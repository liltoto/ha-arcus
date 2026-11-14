import { Icon } from "./Icon";
import { c } from "../styles/classes";

export interface IconButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  dataAct?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  className,
  dataAct,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={c("icon-btn", className)}
      aria-label={label}
      title={label}
      data-act={dataAct}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} />
    </button>
  );
}
