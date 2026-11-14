import type { ReactNode } from "react";
import { c } from "../styles/classes";

export interface ChartBoxProps {
  title?: string;
  caption?: ReactNode;
  noData?: boolean;
  emptyLabel?: string;
  children: ReactNode;
}

/**
 * The bordered chart shell. The page supplies the `<svg>` and the graph
 * bindings; this only owns the frame, the empty overlay, and the caption row.
 */
export function ChartBox({
  title,
  caption,
  noData = false,
  emptyLabel = "No data",
  children,
}: ChartBoxProps) {
  return (
    <div className={c("chart-box", noData && "no-data")}>
      {children}
      <span className={c("chart-empty")}>{emptyLabel}</span>
      {title || caption ? (
        <div className={c("chart-cap")}>
          {title ? <span>{title}</span> : null}
          {caption}
        </div>
      ) : null}
    </div>
  );
}
