export interface SheetGrabProps {
  className?: string;
}

export function SheetGrab({ className }: SheetGrabProps) {
  const classes = ["sheet-grab", className ?? ""].filter(Boolean).join(" ");

  return <div className={classes} data-sheet-grab />;
}
