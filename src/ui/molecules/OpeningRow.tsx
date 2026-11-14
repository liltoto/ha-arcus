import { Icon } from "../atoms/Icon";
import { c } from "../styles/classes";
import { rowActivation } from "./row-activation";

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
  const activate = rowActivation(onClick);

  return (
    <div
      className={c("row", isOpen && "on open")}
      data-open={isOpen ? "true" : "false"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? activate : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      <div className={c("row-main")}>
        <div className={c("row-name")}>{name}</div>
        <div className={c("row-sub")}>{sub}</div>
      </div>
      <span className={c("status-line")}>
        <i className={c("dot", isOpen && "warn")} />
        {status ?? (isOpen ? "Open" : "Closed")}
      </span>
    </div>
  );
}
