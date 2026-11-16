import type { Translator } from "../../../../types";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import { WaterControls } from "./WaterControls";
import type { WaterView } from "./water-view";

interface WaterTodayProps {
  view: WaterView;
  t: Translator;
}

/** The headline consumption and the monthly/total note. */
export const WaterToday = ({ view, t }: WaterTodayProps) => {
  const { day, month, total, fmt } = view;
  return (
    <div className={c("block")}>
      <div className={c("big-read")}>
        {fmt(day, 1)}
        <small>L {t("common.today").toLocaleLowerCase()}</small>
      </div>
      <div className={c("block-note")}>
        {month !== null || total !== null
          ? t("water.note", {
              month: fmt(month, 0),
              total: fmt(total === null ? null : total / 1000, 1),
            })
          : t("empty.data")}
      </div>
    </div>
  );
};

interface WaterReadingsProps {
  view: WaterView;
  t: Translator;
}

/** This month, total use, cost, and the current flow. */
export const WaterReadings = ({ view, t }: WaterReadingsProps) => {
  const { month, total, cost, flow, currency, fmt } = view;
  return (
    <div className={c("readings")}>
      <Readout label={t("water.thisMonth")} value={fmt(month, 0)} unit="L" />
      <Readout
        label={t("water.total")}
        value={fmt(total === null ? null : total / 1000, 1)}
        unit="m³"
      />
      <Readout label={t("water.cost")} value={fmt(cost, 0)} unit={currency} />
      <Readout label={t("water.flowNow")} value={fmt(flow, 2)} unit="m³/h" />
    </div>
  );
};

interface WaterSoftenerProps {
  view: WaterView;
  onToggleHoliday: () => void;
  t: Translator;
}

/** The BWT salt/capacity readings plus the holiday toggle. */
export const WaterSoftener = ({
  view,
  onToggleHoliday,
  t,
}: WaterSoftenerProps) => {
  const {
    softenerTitle,
    state,
    salt,
    saltDays,
    capacity,
    flow,
    holidayId,
    holidayOn,
    fmt,
  } = view;
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{softenerTitle}</div>
        <div className={c("block-label")}>
          <b>{state}</b>
        </div>
      </div>
      <div className={c("readings")}>
        <Readout label={t("water.salt")} value={fmt(salt, 0)} unit="%" />
        <Readout
          label={t("water.daysLeft")}
          value={fmt(saltDays, 0)}
          unit={t("water.days")}
        />
        <Readout
          label={t("water.capacity")}
          value={fmt(capacity, 0)}
          unit="L"
        />
        <Readout label={t("water.flow")} value={fmt(flow, 2)} unit="m³/h" />
      </div>
      {holidayId ? (
        <WaterControls
          entityId={holidayId}
          isOn={holidayOn}
          onChange={onToggleHoliday}
          t={t}
        />
      ) : null}
    </div>
  );
};
