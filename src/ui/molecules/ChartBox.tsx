import type { ReactNode } from "react";
import { c } from "../styles/classes";

export type ChartState = "ready" | "loading" | "empty" | "unavailable";

interface ChartStateLabels {
  empty: string;
  loading: string;
  unavailable: string;
}

/** The overlay label for a chart state, or `null` when the chart has data. */
export function chartStateLabel(
  state: ChartState,
  labels: ChartStateLabels,
): string | null {
  if (state === "loading") return labels.loading;
  if (state === "empty") return labels.empty;
  if (state === "unavailable") return labels.unavailable;
  return null;
}

export interface ChartBoxProps {
  title?: string;
  caption?: ReactNode;
  state?: ChartState;
  emptyLabel?: string;
  loadingLabel?: string;
  unavailableLabel?: string;
  children: ReactNode;
}

/**
 * The bordered chart shell. The page supplies the `<svg>` and the graph
 * bindings; this only owns the frame, the state overlay, and the caption row.
 * `data-state` carries the distinction; the legacy `.no-data` class stays for
 * existing chart styles and assertions.
 */
export function ChartBox({
  title,
  caption,
  state = "ready",
  emptyLabel = "No data",
  loadingLabel = "Loading…",
  unavailableLabel = "Unavailable",
  children,
}: ChartBoxProps) {
  const label = chartStateLabel(state, {
    empty: emptyLabel,
    loading: loadingLabel,
    unavailable: unavailableLabel,
  });

  return (
    <div
      className={c("chart-box", state !== "ready" && "no-data")}
      data-state={state}
      aria-busy={state === "loading" || undefined}
    >
      {children}
      {label === null ? null : (
        <span className={c("chart-empty")}>{label}</span>
      )}
      {title || caption ? (
        <div className={c("chart-cap")}>
          {title ? <span>{title}</span> : null}
          {caption}
        </div>
      ) : null}
    </div>
  );
}
