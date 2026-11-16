import type { AlertModel } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

export type AlertSeverity = "crit" | "warn" | "info";

/** 3 = critical, 2 = warning, everything else is informational. */
export const severityClass = (alert: AlertModel): AlertSeverity => {
  if (alert.sev >= 3) return "crit";
  if (alert.sev === 2) return "warn";
  return "info";
};

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
export const AlertRow = ({ alert, label, see, onOpen }: AlertRowProps) => {
  const cls = severityClass(alert);

  return (
    <button
      type="button"
      className={c("row", "row-button", "alert-row")}
      data-nav={alert.route}
      onClick={onOpen}
    >
      <span className={c("alert-dot", cls)} />
      <span className={c("row-main")}>
        <span className={c("row-name")}>{alert.title}</span>
        <span className={c("row-sub")}>{alert.text}</span>
      </span>
      <span className={c("chip", cls)}>{label}</span>
      <span className={c("row-link")}>
        {see} <Icon name="arrow" />
      </span>
    </button>
  );
};
