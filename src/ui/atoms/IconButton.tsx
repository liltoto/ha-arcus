import { Icon } from "./Icon";

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
  const classes = ["icon-btn", className ?? ""].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
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
