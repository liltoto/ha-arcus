import type { Translator } from "../../../../types";
import { EmptyState } from "../../../atoms/EmptyState";
import { SheetHeader } from "../../../molecules/SheetHeader";
import { c } from "../../../styles/classes";

export interface SecurityEmptyProps {
  t: Translator;
  onClose: () => void;
}

/** The sheet frame when the model has no security section at all. */
export function SecurityEmpty({ t, onClose }: SecurityEmptyProps) {
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
        sum="–"
        closeLabel={t("sheet.close")}
        onClose={onClose}
      />
      <div className={c("sheet-scroll")}>
        <EmptyState icon="shield" title={t("empty.data")} />
      </div>
    </div>
  );
}
