import type { HistoryCache } from "../../../../data/history";
import { c } from "../../../styles/classes";
import { RoomChart } from "./RoomChart";

export interface RoomChartBlockProps {
  title: string;
  value: string;
  entityId: string | undefined;
  color: string;
  height: number;
  unit: string;
  decimals: number;
  history: HistoryCache;
  now: () => Date;
  emptyLabel: string;
  loadingLabel: string;
  unavailableLabel: string;
  unavailable?: boolean;
}

/** One titled 24-hour room chart block. */
export function RoomChartBlock({
  title,
  value,
  entityId,
  color,
  height,
  unit,
  decimals,
  history,
  now,
  emptyLabel,
  loadingLabel,
  unavailableLabel,
  unavailable = false,
}: RoomChartBlockProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{title}</div>
        <div className={c("block-label")}>
          <b>{value}</b>
        </div>
      </div>
      <RoomChart
        history={history}
        entityId={entityId}
        color={color}
        height={height}
        unit={unit}
        decimals={decimals}
        emptyLabel={emptyLabel}
        loadingLabel={loadingLabel}
        unavailableLabel={unavailableLabel}
        unavailable={unavailable}
        now={now}
      />
    </div>
  );
}
