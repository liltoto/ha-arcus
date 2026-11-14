import type { ReactNode } from "react";
import { IconButton } from "../atoms/IconButton";
import { c } from "../styles/classes";

export interface SheetHeaderProps {
  kicker: string;
  title: string;
  sum?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

/** The sticky header at the top of every sheet. */
export function SheetHeader({
  kicker,
  title,
  sum,
  onClose,
  closeLabel = "Close",
}: SheetHeaderProps) {
  return (
    <div className={c("sheet-head")}>
      <div className={c("sheet-kicker")}>{kicker}</div>
      <h2 className={c("sheet-title")}>{title}</h2>
      <div className={c("sheet-sum")}>{sum}</div>
      <IconButton
        icon="close"
        label={closeLabel}
        className={c("sheet-close")}
        dataAct="close"
        onClick={onClose}
      />
    </div>
  );
}
