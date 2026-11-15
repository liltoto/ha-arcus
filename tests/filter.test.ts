import { describe, expect, test } from "vitest";
import { filterOk } from "../src/model/filter";

describe("filterOk", () => {
  test("treats missing and neutral states as healthy", () => {
    for (const value of [
      null,
      undefined,
      "",
      "OK",
      "ok",
      "Nej",
      "Neutral",
      "off",
      "unknown",
      "unavailable",
    ]) {
      expect(filterOk(value)).toBe(true);
    }
  });

  test("accepts the healthy status Nilan reports", () => {
    expect(filterOk("Filter OK")).toBe(true);
    expect(filterOk(" filter  ok ")).toBe(true);
    expect(filterOk("Filter okay")).toBe(true);
    expect(filterOk("filterok")).toBe(true);
  });

  test("keeps real filter alarms active", () => {
    for (const value of [
      "Skift filter",
      "Change filter",
      "Ja",
      "on",
      "Filter alarm",
    ]) {
      expect(filterOk(value)).toBe(false);
    }
  });
});
