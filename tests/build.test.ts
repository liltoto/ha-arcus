import { describe, expect, test } from "vitest";
import { buildModel } from "../src/model/build";
import type { SolarModel } from "../src/types";
import { makeConfig, makeHass } from "./fixtures/home";

// The mock home is in Europe/Copenhagen. Pin the process zone so the fixture's
// record-form timestamps resolve deterministically on CI as well.
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T21:00:00+01:00");
/** `solar.forecastToday`: its `attributes.watts` feeds `forecastSeries`. */
const TODAY = "sensor.hjem_energy_production_today";
/** `solar.forecastTomorrow`: its `attributes.watts` feeds `tomorrowSeries`. */
const TOMORROW = "sensor.hjem_energy_production_tomorrow";

/** Build the public solar model with `watts` on a forecast sensor. */
function solarWithWatts(watts: unknown, entityId: string = TODAY): SolarModel {
  const hass = makeHass();
  hass.states[entityId].attributes.watts = watts;
  return buildModel(hass, makeConfig(), NOW).solar!;
}

describe("solar forecast watts", () => {
  test("parses an array of { t, v } points", () => {
    const solar = solarWithWatts([
      { t: "2026-11-13T09:00:00+01:00", v: 850 },
      { t: "2026-11-13T09:15:00+01:00", v: 1200 },
    ]);

    expect(solar.forecastSeries).toEqual([
      { t: new Date("2026-11-13T09:00:00+01:00"), v: 850 },
      { t: new Date("2026-11-13T09:15:00+01:00"), v: 1200 },
    ]);
  });

  test("parses the time/value and datetime/watts aliases", () => {
    const solar = solarWithWatts([
      { time: "2026-11-13T10:00:00+01:00", value: 640 },
      { datetime: "2026-11-13T10:15:00+01:00", watts: 910 },
    ]);

    expect(solar.forecastSeries).toEqual([
      { t: new Date("2026-11-13T10:00:00+01:00"), v: 640 },
      { t: new Date("2026-11-13T10:15:00+01:00"), v: 910 },
    ]);
  });

  test("skips array entries with invalid dates or non-numeric values", () => {
    const solar = solarWithWatts([
      { t: "not-a-date", v: 100 },
      { t: "2026-11-13T11:00:00+01:00", v: "n/a" },
      { t: "2026-11-13T11:15:00+01:00" },
      { v: 250 },
      { t: "2026-11-13T11:30:00+01:00", v: 720 },
    ]);

    expect(solar.forecastSeries).toEqual([
      { t: new Date("2026-11-13T11:30:00+01:00"), v: 720 },
    ]);
  });

  test("parses the record form and skips bad keys and values", () => {
    const solar = solarWithWatts({
      "not-a-date": 100,
      "2026-11-13T12:00:00+01:00": "n/a",
      "2026-11-13T12:15:00+01:00": 480,
      "2026-11-13T12:30:00+01:00": "560",
    });

    expect(solar.forecastSeries).toEqual([
      { t: new Date("2026-11-13T12:15:00+01:00"), v: 480 },
      { t: new Date("2026-11-13T12:30:00+01:00"), v: 560 },
    ]);
  });

  test("sorts mixed, unsorted points ascending by time", () => {
    const solar = solarWithWatts([
      { t: "2026-11-13T13:00:00+01:00", v: 1300 },
      { datetime: "2026-11-13T09:00:00+01:00", watts: 300 },
      { time: "2026-11-13T11:00:00+01:00", value: 700 },
    ]);
    const series = solar.forecastSeries!;

    expect(series.map((point) => point.v)).toEqual([300, 700, 1300]);
    expect(series.map((point) => point.t.getTime())).toEqual([
      new Date("2026-11-13T09:00:00+01:00").getTime(),
      new Date("2026-11-13T11:00:00+01:00").getTime(),
      new Date("2026-11-13T13:00:00+01:00").getTime(),
    ]);
  });

  test("ignores non-array, non-record watts values", () => {
    for (const watts of [null, 1234, "watts", true, undefined]) {
      const solar = solarWithWatts(watts);
      expect(solar.forecastSeries).toBeUndefined();
      // A malformed forecast must not disturb the numeric solar fields.
      expect(solar.batterySoc).toBe(27);
    }
  });

  test("drops array entries that are not objects", () => {
    // Bare numbers are parsed and then discarded by the array branch, so only
    // the record-shaped entry survives.
    const solar = solarWithWatts([
      120,
      "240",
      null,
      { t: "2026-11-13T14:00:00+01:00", v: 360 },
    ]);

    expect(solar.forecastSeries).toEqual([
      { t: new Date("2026-11-13T14:00:00+01:00"), v: 360 },
    ]);
  });

  test("maps the tomorrow sensor to tomorrowSeries", () => {
    const solar = solarWithWatts(
      [{ t: "2026-11-14T09:00:00+01:00", v: 500 }],
      TOMORROW,
    );

    expect(solar.tomorrowSeries).toEqual([
      { t: new Date("2026-11-14T09:00:00+01:00"), v: 500 },
    ]);
    // The untouched today sensor keeps the fixture's record-form series.
    expect(solar.forecastSeries).toHaveLength(96);
  });
});
