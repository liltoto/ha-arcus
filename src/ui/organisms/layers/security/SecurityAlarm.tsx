import type { Translator } from "../../../../types";
import { c } from "../../../styles/classes";
import { alarmStateLabel } from "./security-view";

const ALARM_ACTIONS = [
  {
    act: "alarm-arm-home",
    service: "alarm_arm_home",
    label: "security.armedHome",
  },
  {
    act: "alarm-arm-away",
    service: "alarm_arm_away",
    label: "security.armedAway",
  },
  {
    act: "alarm-disarm",
    service: "alarm_disarm",
    label: "security.disarmed",
  },
] as const;

export interface SecurityAlarmProps {
  alarmId: string;
  alarmState: string | null;
  t: Translator;
  onCall: (service: string) => void;
}

/** The alarm panel state plus arm-home, arm-away and disarm buttons. */
export function SecurityAlarm({
  alarmId,
  alarmState,
  t,
  onCall,
}: SecurityAlarmProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("security.alarmPanel")}</div>
        <div className={c("block-label")}>
          <b>{alarmStateLabel(t, alarmState)}</b>
        </div>
      </div>
      <div className={c("btn-row")}>
        {ALARM_ACTIONS.map((action) => (
          <button
            key={action.act}
            type="button"
            className={c("btn small")}
            data-act={action.act}
            data-entity={alarmId}
            onClick={() => onCall(action.service)}
          >
            {t(action.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
