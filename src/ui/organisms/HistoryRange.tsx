import { useHistoryRange } from "../hooks/useHistoryRange";
import { useModel, useNow, useTranslator } from "../hooks";
import { RangeBar } from "../molecules/RangeBar";

export interface HistoryRangeProps {
  variant?: "home" | "sheet";
}

/** Data-wired card-wide history control used by the home and sheet shells. */
export const HistoryRange = ({ variant }: HistoryRangeProps) => {
  const { range, stepDay, setDays, setAnchor, reset } = useHistoryRange();
  const model = useModel();
  const t = useTranslator();
  const now = useNow();

  return (
    <RangeBar
      variant={variant}
      range={range}
      t={t}
      language={model.language}
      now={now()}
      onStep={stepDay}
      onDays={setDays}
      onAnchor={setAnchor}
      onToday={reset}
    />
  );
};
