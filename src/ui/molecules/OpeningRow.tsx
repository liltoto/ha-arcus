import type { KeyboardEvent } from "react";
import { Icon } from "../atoms/Icon";

export interface OpeningRowProps {
  name: string;
  kind: string;
  isOpen: boolean;
  room?: string;
  icon?: string;
  onClick?: () => void;
  status?: string;
}

/** A door/window/leak row with the open/closed status line. */
export function OpeningRow({
  name,
  kind,
  isOpen,
  room,
  icon,
  onClick,
  status,
}: OpeningRowProps) {
  const interactive = Boolean(onClick);
  const sub = room ? `${kind} · ${room}` : kind;

  const activate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`row${isOpen ? " on open" : ""}`}
      data-open={isOpen ? "true" : "false"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? activate : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      <div className="row-main">
        <div className="row-name">{name}</div>
        <div className="row-sub">{sub}</div>
      </div>
      <span className="status-line">
        <i className={`dot${isOpen ? " warn" : ""}`} />
        {status ?? (isOpen ? "Open" : "Closed")}
      </span>
    </div>
  );
}
