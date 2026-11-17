import { describe, expect, test } from "vitest";
import type { HistoryCache, HistoryRow } from "../src/data/history";
import { addDays, startOfDay } from "../src/range";
import { dailyProductionDays } from "../src/ui/organisms/layers/solar/helpers";

const NOW = new Date("2026-11-13T12:00:00Z");
const END = startOfDay(addDays(NOW, 1));

const cache = (rows: HistoryRow[]): HistoryCache => {
  return { raw: () => rows } as unknown as HistoryCache;
};

const daysFor = (rows: HistoryRow[]) => {
  return dailyProductionDays(cache(rows), "sensor.today", END, "en", NOW);
};

describe("dailyProductionDays timestamps", () => {
  test("reads numeric epoch seconds and milliseconds", () => {
    const seconds = Math.floor(NOW.getTime() / 1000);
    const days = daysFor([
      { s: "4", lu: seconds },
      { s: "8", lu: NOW.getTime() },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].value).toBe(8);
  });

  test("reads numeric strings as epoch seconds or milliseconds", () => {
    const seconds = Math.floor(NOW.getTime() / 1000);
    const days = daysFor([
      { s: "3", lu: String(seconds) },
      { s: "6", lu: String(NOW.getTime()) },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].value).toBe(6);
  });

  test("reads ISO timestamps from last_updated and last_changed", () => {
    const days = daysFor([
      { s: "2", last_updated: NOW.toISOString() },
      { s: "5", last_changed: NOW.toISOString() },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].value).toBe(5);
  });

  test("skips rows with no usable timestamp", () => {
    expect(
      daysFor([
        { s: "1", lu: "not a date" },
        { s: "2", lu: null },
        { s: "3", lu: "" },
      ]),
    ).toEqual([]);
  });
});
