import type { KeyboardEvent, ReactNode } from "react";
import { Icon } from "../atoms/Icon";

export interface EntityRowProps {
  name: string;
  sub?: string;
  value?: ReactNode;
  unit?: string;
  icon?: string;
  on?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}

/**
 * The generic list row used by most sheet bodies. It is a div rather than a
 * button so a row can host an interactive `trailing` control without nesting
 * buttons; clickable rows get button semantics via role/tabIndex.
 */
export function EntityRow({
  name,
  sub,
  value,
  unit,
  icon,
  on = false,
  onClick,
  trailing,
}: EntityRowProps) {
  const interactive = Boolean(onClick);

  const activate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const right =
    trailing ??
    (value !== undefined && value !== null ? (
      <span className="row-val">
        <span>{value}</span>
        {unit ? <small>{unit}</small> : null}
      </span>
    ) : null);

  return (
    <div
      className={`row${on ? " on" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? activate : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      <div className="row-main">
        <div className="row-name">{name}</div>
        {sub ? <div className="row-sub">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}
