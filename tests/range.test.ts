import { describe, expect, test } from "vitest";
import {
  addDays,
  clampRange,
  clipSeries,
  dateInputValue,
  dayLabel,
  defaultRange,
  parseDateInput,
  resolveRange,
  startOfDay,
  stepRange,
  windowLabel,
  type HistoryRangeState,
} from "../src/range";

const local = (year: number, month: number, day: number, hour = 12): Date =>
  new Date(year, month - 1, day, hour, 0, 0, 0);

const NOW = local(2026, 11, 17, 14);

const state = (year: number, month: number, day: number): HistoryRangeState => {
  return { anchor: startOfDay(local(year, month, day)), days: 1 };
};

describe("range resolution", () => {
  test("defaults to today's calendar day", () => {
    const range = resolveRange(defaultRange(NOW), NOW);
    expect(range.live).toBe(true);
    expect(range.days).toBe(1);
    expect(range.start).toBe(startOfDay(NOW));
    expect(range.end).toBe(startOfDay(addDays(NOW, 1)));
  });

  test("a one-day past window is the whole local day", () => {
    const range = resolveRange(state(2026, 11, 16), NOW);
    expect(range.live).toBe(false);
    expect(new Date(range.start).getDate()).toBe(16);
    expect(new Date(range.end).getDate()).toBe(17);
    expect(range.end - range.start).toBeGreaterThanOrEqual(23 * 3_600_000);
    expect(range.end - range.start).toBeLessThanOrEqual(25 * 3_600_000);
  });

  test("seven and thirty days end on the anchor day", () => {
    const week = resolveRange({ ...state(2026, 11, 17), days: 7 }, NOW);
    expect(new Date(week.start).getDate()).toBe(11);
    expect(week.live).toBe(true);

    const month = resolveRange({ ...state(2026, 11, 17), days: 30 }, NOW);
    expect(new Date(month.start).getMonth()).toBe(9);
    expect(new Date(month.start).getDate()).toBe(19);
  });

  test("clamps a future anchor to today", () => {
    const future = state(2026, 12, 1);
    expect(clampRange(future, NOW).anchor).toBe(startOfDay(NOW));
    const range = resolveRange(future, NOW);
    expect(range.anchor).toBe(startOfDay(NOW));
    expect(range.live).toBe(true);
  });

  test("steps across a month boundary and stops at today", () => {
    const back = stepRange(state(2026, 11, 1), -1, NOW);
    expect(new Date(back.anchor).getMonth()).toBe(9);
    expect(new Date(back.anchor).getDate()).toBe(31);

    const forward = stepRange({ ...state(2026, 11, 17), days: 7 }, 1, NOW);
    expect(forward.anchor).toBe(startOfDay(NOW));
    expect(forward.days).toBe(7);
  });

  test("a live range follows today across midnight", () => {
    const evening = new Date(2026, 10, 17, 23, 0);
    const next = new Date(2026, 10, 18, 0, 5);
    const live = resolveRange(defaultRange(evening), next);
    expect(live.anchor).toBe(startOfDay(next));
    expect(live.live).toBe(true);

    const fixed = resolveRange({ anchor: startOfDay(evening), days: 1 }, next);
    expect(fixed.anchor).toBe(startOfDay(evening));
    expect(fixed.live).toBe(false);
  });

  test("keeps calendar days across a DST change", () => {
    const dstNow = local(2026, 3, 30, 14);
    const range = resolveRange(state(2026, 3, 29), dstNow);
    expect(new Date(range.start).getDate()).toBe(29);
    expect(new Date(range.end).getDate()).toBe(30);
    // The window is a calendar day; in DST zones it is 23 hours long.
    expect(range.end - range.start).toBeGreaterThanOrEqual(23 * 3_600_000);
    expect(range.end - range.start).toBeLessThanOrEqual(25 * 3_600_000);
  });
});

describe("live clipping", () => {
  const range = resolveRange(defaultRange(NOW), NOW);

  test("nulls buckets after now", () => {
    const values = Array.from({ length: 96 }, (_, index) => index);
    const clipped = clipSeries(values, 96, range, NOW);
    const cutoff = Math.floor(
      ((NOW.getTime() - range.start) / (range.end - range.start)) * 96,
    );
    expect(clipped[cutoff]).toBe(cutoff);
    expect(clipped[cutoff + 1]).toBeNull();
    expect(clipped[0]).toBe(0);
  });

  test("keeps a completed past window untouched", () => {
    const past = resolveRange(state(2026, 11, 16), NOW);
    const values = [1, 2, 3];
    expect(clipSeries(values, 3, past, NOW)).toEqual(values);
  });

  test("returns no values before the window starts", () => {
    expect(clipSeries([1, 2], 2, range, local(2026, 11, 17, 0))).toEqual([
      null,
      null,
    ]);
  });
});

describe("date input helpers", () => {
  test("round-trips a local calendar day", () => {
    const epoch = startOfDay(local(2026, 1, 5));
    expect(dateInputValue(epoch)).toBe("2026-01-05");
    expect(parseDateInput("2026-01-05")).toBe(epoch);
  });

  test("rejects malformed values", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput("05/01/2026")).toBeNull();
  });
});

describe("labels", () => {
  test("formats a single day with the weekday", () => {
    expect(dayLabel(startOfDay(local(2026, 11, 17)), "da", NOW)).toContain(
      "17",
    );
    expect(dayLabel(startOfDay(local(2026, 11, 17)), "en", NOW)).toContain(
      "17",
    );
  });

  test("formats a window range", () => {
    const week = resolveRange({ ...state(2026, 11, 17), days: 7 }, NOW);
    const label = windowLabel(week, "da", NOW);
    expect(label).toContain("11");
    expect(label).toContain("17");
  });

  test("includes the year outside the current year", () => {
    const past = resolveRange(state(2025, 11, 17), NOW);
    expect(dayLabel(past.anchor, "da", NOW)).toContain("2025");
  });
});
