import type { Language, Translator } from "./types";

/**
 * The card-wide history window.
 *
 * The anchor is the local calendar day the window ends on, stored as the
 * epoch milliseconds of that day's midnight. `days` is the window length, so
 * `days: 1` is one calendar day and `days: 7` is the seven days ending on the
 * anchor. Calendar arithmetic (rather than fixed 24-hour steps) keeps DST
 * days correct.
 */
export type RangeDays = 1 | 7 | 30;

export interface HistoryRangeState {
  anchor: number;
  days: RangeDays;
  /** Follow the current day across midnight while the anchor is today. */
  live?: boolean;
}

export interface ResolvedHistoryRange extends HistoryRangeState {
  /** Local midnight of the first day in the window. */
  start: number;
  /** Local midnight after the anchor day (exclusive). */
  end: number;
  /** True when the anchor day is today. */
  live: boolean;
}

const localeFor = (language: Language): string =>
  language === "da" ? "da-DK" : "en-GB";

/** Local midnight for an epoch timestamp or Date. */
export const startOfDay = (value: number | Date): number => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

/** Calendar-day arithmetic; `setDate` keeps DST days 23/25 hours long. */
export const addDays = (value: number | Date, days: number): Date => {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

/** The default view: today, one calendar day. */
export const defaultRange = (now: Date): HistoryRangeState => {
  return { anchor: startOfDay(now), days: 1, live: true };
};

/**
 * Never allow an anchor in the future. A live range follows today across
 * midnight; a fixed past range keeps its anchor.
 */
export const clampRange = (
  state: HistoryRangeState,
  now: Date,
): HistoryRangeState => {
  const today = startOfDay(now);
  const live = state.live ?? false;
  return {
    anchor: live ? today : Math.min(startOfDay(state.anchor), today),
    days: state.days,
    live,
  };
};

/** Resolve the raw state into the window every chart reads. */
export const resolveRange = (
  state: HistoryRangeState,
  now: Date,
): ResolvedHistoryRange => {
  const clamped = clampRange(state, now);
  const end = startOfDay(addDays(clamped.anchor, 1));
  const start = startOfDay(addDays(clamped.anchor, -(clamped.days - 1)));
  return {
    ...clamped,
    start,
    end,
    // A state anchored today is live even if the caller omitted the flag;
    // a fixed state keeps its past anchor across midnight.
    live: Boolean(clamped.live) || clamped.anchor === startOfDay(now),
  };
};

/** Move the anchor by whole days, clamped at today. */
export const stepRange = (
  state: HistoryRangeState,
  days: number,
  now: Date,
): HistoryRangeState => {
  const today = startOfDay(now);
  const anchor = Math.min(
    startOfDay(addDays(state.anchor, days).getTime()),
    today,
  );
  // Stepping back from a live range fixes the anchor; stepping forward to
  // today resumes following the clock.
  return {
    anchor,
    days: state.days,
    live: anchor === today,
  };
};

/**
 * Null the buckets after the current instant so a live day shows "today so
 * far" instead of holding the last value through the future.
 */
export const clipSeries = (
  values: Array<number | null>,
  buckets: number,
  range: ResolvedHistoryRange,
  now: Date,
): Array<number | null> => {
  if (!values.length) return values;
  const nowMs = now.getTime();
  if (nowMs >= range.end) return values;
  if (nowMs <= range.start) return values.map(() => null);
  const count = values.length || buckets;
  const cutoff = Math.floor(
    ((nowMs - range.start) / (range.end - range.start)) * count,
  );
  return values.map((value, index) => (index <= cutoff ? value : null));
};

/** The last day inside a resolved window, local midnight. */
const lastDay = (range: ResolvedHistoryRange): number => {
  return startOfDay(range.end - 1);
};

/** "man. 17. nov." or "17. nov. 2025". */
export const dayLabel = (
  anchor: number,
  language: Language,
  now: Date,
): string => {
  const date = new Date(anchor);
  const includeYear = date.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(date);
};

/** "10.–17. nov." for a multi-day window. */
export const windowLabel = (
  range: ResolvedHistoryRange,
  language: Language,
  now: Date,
): string => {
  if (range.days === 1) return dayLabel(range.anchor, language, now);
  const first = new Date(range.start);
  const last = new Date(lastDay(range));
  const includeYear =
    first.getFullYear() !== now.getFullYear() ||
    last.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  }).formatRange(first, last);
};

/** The period shown after a chart title (\"I dag\", \"16. nov.\", \"7 dage\"). */
export const rangePeriodLabel = (
  range: ResolvedHistoryRange,
  t: Translator,
  language: Language,
  now: Date,
): string => {
  if (range.days === 1) {
    return range.live
      ? t("range.today")
      : dayLabel(range.anchor, language, now);
  }
  return t(`range.days${range.days}`);
};

/** The `value` for an `<input type="date">`, in the local calendar day. */
export const dateInputValue = (epoch: number): string => {
  const date = new Date(epoch);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Parse an `<input type="date">` value as local midnight, not UTC. */
export const parseDateInput = (value: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
};
