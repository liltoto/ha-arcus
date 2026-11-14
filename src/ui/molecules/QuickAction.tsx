import { Icon } from "../atoms/Icon";
import { c } from "../styles/classes";

export interface QuickActionProps {
  icon: string;
  label: string;
  on?: boolean;
  onClick: () => void;
}

/** A pill-shaped shortcut below the chapter grid. */
export function QuickAction({
  icon,
  label,
  on = false,
  onClick,
}: QuickActionProps) {
  return (
    <button
      type="button"
      className={c("quick", on && "on")}
      aria-pressed={on || undefined}
      onClick={onClick}
    >
      <Icon name={icon} />
      {label}
    </button>
  );
}
