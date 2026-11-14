import type { Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";
import type { WaterView } from "./water-view";

interface LeakRowProps {
  name: string;
  on: boolean;
  t: Translator;
}

function LeakRow({ name, on, t }: LeakRowProps) {
  return (
    <div className={c("row")}>
      <Icon name="drop" />
      <div className={c("row-main")}>
        <div className={c("row-name")}>{name}</div>
        <div className={c("row-sub")}>
          {on ? t("water.waterDetected") : t("water.noWater")}
        </div>
      </div>
      <span className={c("status-line")}>
        <i className={c("dot", on && "warn")} />
        {on ? t("water.alarm") : t("common.ok")}
      </span>
    </div>
  );
}

interface WaterLeaksProps {
  view: WaterView;
  t: Translator;
}

/** The leak sensors and, when present, the leak sensor battery. */
export function WaterLeaks({ view, t }: WaterLeaksProps) {
  const { leaks, leak, leakBattery, fmt } = view;
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("water.leak")}</div>
        <div className={c("block-label")}>
          <b>{leak ? t("water.alarm") : t("water.allDry")}</b>
        </div>
      </div>
      {leaks.length ? (
        leaks.map((row) => (
          <LeakRow key={row.entityId} name={row.name} on={row.on} t={t} />
        ))
      ) : (
        <div className={c("block-note")}>{t("empty.data")}</div>
      )}
      {leakBattery ? (
        <div className={c("row")}>
          <Icon name="battery" />
          <div className={c("row-main")}>
            <div className={c("row-name")}>{t("water.battery")}</div>
            <div className={c("row-sub")}>
              {!leakBattery.name ||
              leakBattery.name === leakBattery.entityId ||
              /klippbok/i.test(leakBattery.entityId)
                ? t("water.leakBattery")
                : leakBattery.name}
            </div>
          </div>
          <span className={c("row-val")}>
            {leakBattery.level === null ? "–" : fmt(leakBattery.level, 0)}
            <small>%</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}
