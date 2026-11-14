import type { KeyboardEvent } from "react";
import type { AlertModel } from "../../../../types";
import { Icon } from "../../../atoms/Icon";

export type AlertSeverity = "crit" | "warn" | "info";

/** 3 = critical, 2 = warning, everything else is informational. */
export function severityClass(alert: AlertModel): AlertSeverity {
  if (alert.sev >= 3) return "crit";
  if (alert.sev === 2) return "warn";
  return "info";
}

export interface AlertRowProps {
  alert: AlertModel;
  label: string;
  see: string;
  onOpen: () => void;
}

/**
 * One alert row. Keeps the legacy `.row.alert-row` markup, the severity dot
 * and chip, and the `data-nav` route to the layer that owns the problem.
 */
export function AlertRow({ alert, label, see, onOpen }: AlertRowProps) {
  const cls = severityClass(alert);

  const activate = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  };

  return (
    <div
      className="row alert-row"
      data-nav={alert.route}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={activate}
    >
      <span className={`alert-dot ${cls}`} />
      <span className="row-main">
        <div className="row-name">{alert.title}</div>
        <div className="row-sub">{alert.text}</div>
      </span>
      <span className={`chip ${cls}`}>{label}</span>
      <span className="row-link">
        {see} <Icon name="arrow" />
      </span>
    </div>
  );
}
