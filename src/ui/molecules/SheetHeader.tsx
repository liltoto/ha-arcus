import type { ReactNode } from "react";
import { IconButton } from "../atoms/IconButton";

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
    <div className="sheet-head">
      <div className="sheet-kicker">{kicker}</div>
      <h2 className="sheet-title">{title}</h2>
      <div className="sheet-sum">{sum}</div>
      <IconButton
        icon="close"
        label={closeLabel}
        className="sheet-close"
        dataAct="close"
        onClick={onClose}
      />
    </div>
  );
}
