import { useState } from "react";
import type { SecurityLockModel } from "../../../types";
import {
  useActions,
  useConfig,
  useHass,
  useModel,
  useTranslator,
} from "../../hooks";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";
import { SecurityAlarm } from "./security/SecurityAlarm";
import { SecurityAutomation } from "./security/SecurityAutomation";
import { SecurityBatteries } from "./security/SecurityBatteries";
import { SecurityEmpty } from "./security/SecurityEmpty";
import { SecurityHouseMap } from "./security/SecurityHouseMap";
import { SecurityLocks } from "./security/SecurityLocks";
import { SecurityOpenings } from "./security/SecurityOpenings";
import { resolveSecurityView } from "./security/security-view";

/**
 * Security: the house schematic, every door/window/leak, battery levels, the
 * window-alert automation and the shortcut to the full alert list.
 *
 * The resolved security model carries the summary counts. Per-opening live
 * states come from `hass`; when a state is missing, the model's open count is
 * used as a deterministic fallback so the sheet never claims everything is
 * closed when the model says something is open.
 */
export const SecurityBody = (_props: LayerBodyProps) => {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const actions = useActions();
  const [confirmingAlertOff, setConfirmingAlertOff] = useState(false);
  const security = model.security;

  const close = () => actions.closeSheet();

  if (!security) {
    return <SecurityEmpty t={t} onClose={close} />;
  }

  const view = resolveSecurityView(hass, model, config, security, t);

  const toggleWindowAlert = (): void => {
    if (!view.alertId) return;
    if (view.alertOn) {
      setConfirmingAlertOff(true);
      return;
    }
    actions.callService(
      "input_boolean",
      "toggle",
      {},
      { entity_id: view.alertId },
    );
  };

  const confirmAlertOff = (): void => {
    if (view.alertId) {
      actions.callService(
        "input_boolean",
        "toggle",
        {},
        { entity_id: view.alertId },
      );
    }
    setConfirmingAlertOff(false);
  };

  const toggleLock = (lock: SecurityLockModel): void => {
    actions.callService(
      "lock",
      lock.locked ? "unlock" : "lock",
      {},
      { entity_id: lock.entityId },
    );
  };

  const callAlarm = (service: string): void => {
    if (!view.alarmId) return;
    actions.callService(
      "alarm_control_panel",
      service,
      {},
      { entity_id: view.alarmId },
    );
  };

  return (
    <div
      data-react-layer
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      <SheetHeader
        kicker={t("sheet.kickerSecurity")}
        title={t("sheet.titleSecurity")}
        sum={view.summary}
        closeLabel={t("sheet.close")}
        onClose={close}
      />
      <div className={c("sheet-scroll")}>
        <SecurityHouseMap
          rooms={model.rooms}
          dots={view.dots}
          leak={view.leak}
          openCount={view.openCount}
          lowBattery={view.lowBattery}
          t={t}
        />
        {view.locks.length ? (
          <SecurityLocks locks={view.locks} t={t} onToggle={toggleLock} />
        ) : null}
        {view.alarmId ? (
          <SecurityAlarm
            alarmId={view.alarmId}
            alarmState={view.alarmState}
            t={t}
            onCall={callAlarm}
          />
        ) : null}
        <SecurityOpenings
          rows={view.openings}
          openCount={view.openCount}
          t={t}
          onNavigate={actions.navigate}
        />
        {view.batteries.length ? (
          <SecurityBatteries batteries={view.batteries} t={t} />
        ) : null}
        <SecurityAutomation
          alertId={view.alertId}
          alertOn={view.alertOn}
          openWindowsLabel={view.openWindowsLabel}
          alertCount={view.alertCount}
          confirming={confirmingAlertOff}
          t={t}
          onToggleWindowAlert={toggleWindowAlert}
          onConfirmAlertOff={confirmAlertOff}
          onCancelAlertOff={() => setConfirmingAlertOff(false)}
          onOpenAlerts={() => actions.navigate("alarmer")}
        />
      </div>
    </div>
  );
};
