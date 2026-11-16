import { c } from "../styles/classes";

export interface SheetGrabProps {
  className?: string;
}

export const SheetGrab = ({ className }: SheetGrabProps) => {
  return <div className={c("sheet-grab", className)} data-sheet-grab />;
};
