import type { SecurityBatteryModel, Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { BatteryRow } from "../../../molecules/BatteryRow";
import { c } from "../../../styles/classes";

const UnknownBatteryRow = ({ battery }: { battery: SecurityBatteryModel }) => {
  return (
    <div className={c("row")}>
      <Icon name="battery" />
      <span className={c("row-main")}>
        <div className={c("row-name")}>{battery.name}</div>
        <div className={c("row-sub")}>–</div>
      </span>
      <div className={c("bar")} data-batt={battery.entityId}>
        <i style={{ width: "0%" }} />
      </div>
      <span className={c("row-val")}>–</span>
    </div>
  );
};

export interface SecurityBatteriesProps {
  batteries: SecurityBatteryModel[];
  t: Translator;
}

/** Battery levels, lowest first; unknown levels keep a placeholder row. */
export const SecurityBatteries = ({ batteries, t }: SecurityBatteriesProps) => {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("security.batteries")}</div>
        <div className={c("block-label")}>
          <b>{t("security.lowestFirst")}</b>
        </div>
      </div>
      <div className={c("battery-list")}>
        {batteries.map((battery) =>
          battery.level === null ? (
            <UnknownBatteryRow key={battery.entityId} battery={battery} />
          ) : (
            <BatteryRow
              key={battery.entityId}
              name={battery.name}
              value={battery.level}
              sub={
                battery.level < 20 ? t("security.changeSoon") : t("security.ok")
              }
              entity={battery.entityId}
            />
          ),
        )}
      </div>
    </div>
  );
};
