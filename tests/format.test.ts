import { describe, expect, test, vi } from "vitest";
import {
  countdown,
  formatDateLong,
  formatNumber,
  formatPrice,
  formatTime,
  formatUnit,
  greeting,
} from "../src/format";

// The exact ISO-time assertion below is written from the user's Danish
// perspective. Pin the process timezone so the suite also passes on CI.
vi.stubEnv("TZ", "Europe/Copenhagen");

describe("formatNumber", () => {
  test("uses Danish and English decimal separators", () => {
    expect(formatNumber(12.345, 1, "da")).toBe("12,3");
    expect(formatNumber(12.345, 1, "en")).toBe("12.3");
    expect(formatNumber(1234.5, 1, "da")).toBe("1.234,5");
    expect(formatNumber(1234.5, 1, "en")).toBe("1,234.5");
  });

  test("honours the requested digits", () => {
    expect(formatNumber(21.4, 0, "da")).toBe("21");
    expect(formatNumber(21.4, 2, "da")).toBe("21,40");
    expect(formatNumber(0, 0, "da")).toBe("0");
  });

  test("returns an en dash for missing or invalid values", () => {
    expect(formatNumber(null, 1, "da")).toBe("–");
    expect(formatNumber(undefined, 1, "en")).toBe("–");
    expect(formatNumber("unavailable", 1, "da")).toBe("–");
    expect(formatNumber(Number.NaN, 1, "da")).toBe("–");
  });

  test("accepts numeric strings", () => {
    expect(formatNumber("21.44", 1, "da")).toBe("21,4");
  });
});

describe("formatPrice", () => {
  test("uses exactly two decimals", () => {
    expect(formatPrice(1.75, "da")).toBe("1,75");
    expect(formatPrice(1.75, "en")).toBe("1.75");
    expect(formatPrice(1.0992, "da")).toBe("1,10");
  });

  test("returns an en dash for missing values", () => {
    expect(formatPrice(null, "da")).toBe("–");
    expect(formatPrice(undefined, "en")).toBe("–");
  });
});

describe("formatTime", () => {
  test("formats the exact prototype time with a colon", () => {
    expect(formatTime(new Date("2026-11-13T05:32:00+01:00"), "da")).toBe(
      "05:32",
    );
    expect(formatTime(new Date("2026-11-13T05:32:00+01:00"), "en")).toBe(
      "05:32",
    );
  });

  test("uses 24-hour time at midnight and late evening", () => {
    expect(formatTime(new Date(2026, 10, 13, 0, 5), "da")).toBe("00:05");
    expect(formatTime(new Date(2026, 10, 13, 23, 59), "da")).toBe("23:59");
  });

  test("returns an en dash for missing or invalid dates", () => {
    expect(formatTime(null, "da")).toBe("–");
    expect(formatTime("not-a-date", "da")).toBe("–");
  });
});

describe("formatDateLong", () => {
  const date = new Date("2026-11-13T12:00:00+01:00");

  test("formats a long Danish and English date", () => {
    expect(formatDateLong(date, "da")).toBe("fredag 13. november");
    expect(formatDateLong(date, "en")).toBe("Friday 13 November");
  });

  test("returns an en dash for invalid dates", () => {
    expect(formatDateLong(null, "da")).toBe("–");
  });
});

describe("greeting", () => {
  test("uses the prototype boundaries in Danish", () => {
    expect(greeting(new Date(2026, 10, 13, 4, 59), "da")).toBe("Godnat");
    expect(greeting(new Date(2026, 10, 13, 5, 0), "da")).toBe("Godmorgen");
    expect(greeting(new Date(2026, 10, 13, 10, 59), "da")).toBe("Godmorgen");
    expect(greeting(new Date(2026, 10, 13, 11, 0), "da")).toBe("Godmiddag");
    expect(greeting(new Date(2026, 10, 13, 16, 59), "da")).toBe("Godmiddag");
    expect(greeting(new Date(2026, 10, 13, 17, 0), "da")).toBe("Godaften");
    expect(greeting(new Date(2026, 10, 13, 22, 59), "da")).toBe("Godaften");
    expect(greeting(new Date(2026, 10, 13, 23, 0), "da")).toBe("Godnat");
  });

  test("uses English greetings", () => {
    expect(greeting(new Date(2026, 10, 13, 8, 0), "en")).toBe("Good morning");
    expect(greeting(new Date(2026, 10, 13, 14, 0), "en")).toBe(
      "Good afternoon",
    );
    expect(greeting(new Date(2026, 10, 13, 19, 0), "en")).toBe("Good evening");
    expect(greeting(new Date(2026, 10, 13, 2, 0), "en")).toBe("Good night");
  });
});

describe("countdown", () => {
  const now = new Date("2026-11-13T10:00:00+01:00");
  const inMinutes = (minutes: number) =>
    new Date(now.getTime() + minutes * 60_000);

  test("formats hours and minutes", () => {
    expect(countdown(inMinutes(4 * 60 + 13), now, "da")).toBe("om 4 t 13 min");
    expect(countdown(inMinutes(4 * 60 + 13), now, "en")).toBe("in 4 h 13 min");
  });

  test("formats short and exact-hour countdowns", () => {
    expect(countdown(inMinutes(45), now, "da")).toBe("om 45 min");
    expect(countdown(inMinutes(45), now, "en")).toBe("in 45 min");
    expect(countdown(inMinutes(120), now, "da")).toBe("om 2 t");
    expect(countdown(inMinutes(120), now, "en")).toBe("in 2 h");
  });

  test("wraps a past target to the next day", () => {
    expect(countdown(inMinutes(-60), now, "da")).toBe("om 23 t");
    expect(countdown(inMinutes(-60), now, "en")).toBe("in 23 h");
  });

  test("returns an en dash for invalid input", () => {
    expect(countdown(null, now, "da")).toBe("–");
    expect(countdown(inMinutes(10), null, "da")).toBe("–");
  });
});

describe("formatUnit", () => {
  test("formats a value and its unit", () => {
    expect(formatUnit(21.44, "°C", "da", 1)).toBe("21,4 °C");
    expect(formatUnit(21.44, "°C", "en", 1)).toBe("21.4 °C");
    expect(formatUnit(665, "W", "da")).toBe("665 W");
    expect(formatUnit(2.5, "kWh", "da", 2)).toBe("2,50 kWh");
  });

  test("returns an en dash without a unit when missing", () => {
    expect(formatUnit(null, "°C", "da", 1)).toBe("–");
    expect(formatUnit(undefined, "kWh", "en", 1)).toBe("–");
  });
});
