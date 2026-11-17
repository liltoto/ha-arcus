import { useEffect } from "react";
import type { HistoryCache, HistoryStatus } from "../../data/history";
import {
  clipSeries,
  startOfDay,
  stepRange,
  type RangeDays,
  type ResolvedHistoryRange,
} from "../../range";
import type { ChartState } from "../molecules/ChartBox";
import {
  useActions,
  useHistory,
  useNow,
  useRange,
} from "../providers/ArcusProvider";

/** One day of padding makes the previous/next arrow feel instant. */
const PREFETCH_MS = 86_400_000;

export interface HistoryRangeControls {
  range: ResolvedHistoryRange;
  stepDay(delta: number): void;
  setDays(days: RangeDays): void;
  setAnchor(anchor: number): void;
  reset(): void;
}

/** Read and move the card-wide history window. */
export const useHistoryRange = (): HistoryRangeControls => {
  const range = useRange();
  const actions = useActions();
  const now = useNow();

  return {
    range,
    stepDay: (delta) => {
      actions.setHistoryRange(
        stepRange(
          { anchor: range.anchor, days: range.days, live: range.live },
          delta,
          now(),
        ),
      );
    },
    setDays: (days) => {
      actions.setHistoryRange({
        anchor: range.anchor,
        days,
        live: range.live,
      });
    },
    setAnchor: (anchor) => {
      actions.setHistoryRange({
        anchor,
        days: range.days,
        live: anchor === startOfDay(now()),
      });
    },
    reset: () => {
      actions.setHistoryRange({
        anchor: startOfDay(now()),
        days: range.days,
        live: true,
      });
    },
  };
};

/**
 * Recorder state for the selected window. `rangeStatus` is preferred when the
 * cache implements it; story/test stubs may only expose `status`.
 */
export const rangeStatusFor = (
  history: HistoryCache,
  entityId: string | null | undefined,
  range: ResolvedHistoryRange,
): HistoryStatus => {
  if (!entityId) return "empty";
  if (typeof history.rangeStatus === "function") {
    return history.rangeStatus(entityId, range.start, range.end);
  }
  if (typeof history.status !== "function") return "idle";
  return history.status(entityId);
};

/** A held window series, clipped to now when the window is live. */
export const windowSeries = (
  history: HistoryCache,
  entityId: string | null | undefined,
  range: ResolvedHistoryRange,
  now: Date,
  buckets = 96,
  fill: number | "hold" | null = "hold",
): Array<number | null> => {
  if (!entityId) return [];
  const values = history.series(entityId, {
    start: range.start,
    end: range.end,
    buckets,
    fill,
  });
  return clipSeries(values, buckets, range, now);
};

/** Map a history status onto the shared chart overlay state. */
export const chartStateFor = (
  hasData: boolean,
  status: HistoryStatus,
  unavailable = false,
): ChartState => {
  if (hasData) return "ready";
  if (unavailable || status === "failed") return "unavailable";
  return status === "idle" || status === "loading" ? "loading" : "empty";
};

/**
 * Load the selected window for one chart group.
 *
 * Most entities are covered by the card's range fetch, but sheet-specific
 * ids (energy appliances, a price sensor) are not in `_historyIds`. A short
 * debounce collapses the effect churn from fast arrow taps. Test/story
 * stubs that only implement `ensure` are left alone.
 */
export const useRangeEnsure = (
  ids: Array<string | null | undefined>,
  /** Extra history before the range start for fixed-length charts. */
  beforeMs: number = PREFETCH_MS,
): void => {
  const history = useHistory();
  const range = useRange();
  const now = useNow();
  const key = ids
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .join("|");

  useEffect(() => {
    if (!key) return;
    if (typeof history.ensureRange !== "function") return;
    const timer = setTimeout(() => {
      const end = Math.min(range.end, now().getTime());
      const start = Math.max(0, range.start - beforeMs);
      if (start >= end) return;
      void history.ensureRange(key.split("|"), start, end).catch(() => {
        /* history is optional; current values still render */
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [history, key, range.start, range.end, now, beforeMs]);
};
