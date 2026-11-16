import type { Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { ConfirmBar } from "../../../molecules/ConfirmBar";
import { ToggleRow } from "../../../molecules/ToggleRow";
import { c } from "../../../styles/classes";

export interface SecurityAutomationProps {
  alertId: string | undefined;
  alertOn: boolean;
  openWindowsLabel: string;
  alertCount: number;
  confirming: boolean;
  t: Translator;
  onToggleWindowAlert: () => void;
  onConfirmAlertOff: () => void;
  onCancelAlertOff: () => void;
  onOpenAlerts: () => void;
}

/**
 * The window-alert automation, the live open-window count and the shortcut to
 * the full alert list. Turning the alert off asks for confirmation first.
 */
export const SecurityAutomation = ({
  alertId,
  alertOn,
  openWindowsLabel,
  alertCount,
  confirming,
  t,
  onToggleWindowAlert,
  onConfirmAlertOff,
  onCancelAlertOff,
  onOpenAlerts,
}: SecurityAutomationProps) => {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("security.automation")}</div>
      {alertId ? (
        <ToggleRow
          label={t("security.windowAlert")}
          sub={t("security.windowAlertSub")}
          isOn={alertOn}
          dataAct="toggle-bool"
          dataEntity={alertId}
          onChange={onToggleWindowAlert}
        />
      ) : (
        <div className={c("row")}>
          <span className={c("row-main")}>
            <div className={c("row-name")}>{t("security.windowAlert")}</div>
            <div className={c("row-sub")}>{t("security.windowAlertSub")}</div>
          </span>
          <span className={c("row-val")}>
            {alertOn ? t("common.on") : t("common.off")}
          </span>
        </div>
      )}
      <div className={c("row")}>
        <span className={c("row-main")}>
          <div className={c("row-name")}>{t("security.openWindows")}</div>
          <div className={c("row-sub")}>{t("security.liveCount")}</div>
        </span>
        <span className={c("row-val")}>{openWindowsLabel}</span>
      </div>
      <div className={c("row")}>
        <Icon name="bell" />
        <div className={c("row-main")}>
          <div className={c("row-name")}>{t("sheet.titleAlerts")}</div>
          <div className={c("row-sub")}>
            {alertCount
              ? t("alerts.summaryCount", { count: alertCount })
              : t("alerts.summaryCalm")}
          </div>
        </div>
        <button
          type="button"
          className={c("btn small")}
          data-act="alarm-action"
          onClick={onOpenAlerts}
        >
          {t("alerts.see")}
        </button>
      </div>
      {confirming ? (
        <ConfirmBar
          text={t("security.windowAlertSub")}
          confirmAct="toggle-bool"
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          onConfirm={onConfirmAlertOff}
          onCancel={onCancelAlertOff}
        />
      ) : null}
    </div>
  );
};
