import { afterEach, expect, test, vi } from "vitest";
import {
  HistoryCache,
  type HistoryHass,
  type HistoryRow,
  type HistoryWsRequest,
} from "../src/data/history";

const FIXED = new Date("2026-11-13T10:00:00+01:00");

function makeHass(
  callWS: HistoryHass["callWS"],
  callApi: HistoryHass["callApi"] = async () => [],
): HistoryHass {
  return { callWS, callApi };
}

afterEach(() => {
  vi.useRealTimers();
});

test("reads object responses with numeric timestamps", async () => {
  const calls: HistoryWsRequest[] = [];
  const hass = makeHass(async (message) => {
    calls.push(message);
    return {
      "sensor.a": [
        { s: "1", lu: 1763000000 },
        { s: "unavailable", lu: 1763003600 },
      ],
    };
  });
  const cache = new HistoryCache(hass, () => FIXED);

  await cache.ensure(["sensor.a"], 24);

  expect(cache.series("sensor.a")).toEqual([1, null]);
  expect(cache.raw("sensor.a")).toHaveLength(2);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    type: "history/history_during_period",
    start_time: "2026-11-12T09:00:00.000Z",
    end_time: "2026-11-13T09:00:00.000Z",
    entity_ids: ["sensor.a"],
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  });
});

test("reads array-of-arrays responses with ISO timestamps", async () => {
  const hass = makeHass(async () => [
    [
      { state: "2.5", last_updated: "2026-11-13T08:00:00+01:00" },
      { state: "unknown", last_changed: "2026-11-13T09:00:00+01:00" },
      { state: "3", last_updated: "2026-11-13T10:00:00+01:00" },
    ],
  ]);
  const cache = new HistoryCache(hass, () => FIXED);

  await cache.ensure(["sensor.b"], 12);

  expect(cache.series("sensor.b")).toEqual([2.5, null, 3]);
  expect(cache.raw("sensor.b")[0]).toMatchObject({
    state: "2.5",
    last_updated: "2026-11-13T08:00:00+01:00",
  });
});

test("falls back to REST when the WebSocket request rejects", async () => {
  const ws = vi.fn(async (_message: HistoryWsRequest) => {
    throw new Error("ws unavailable");
  });
  const api = vi.fn(async (_method: string, _path: string) => [
    [{ s: "4", lu: "2026-11-13T09:30:00+01:00" }],
  ]);
  const cache = new HistoryCache(makeHass(ws, api), () => FIXED);
  const start = new Date(FIXED.getTime() - 6 * 60 * 60 * 1000).toISOString();

  await cache.ensure(["sensor.c"], 6);

  expect(ws).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api.mock.calls[0][0]).toBe("GET");
  expect(api.mock.calls[0][1]).toBe(
    `history/period/${encodeURIComponent(start)}?filter_entity_id=sensor.c&minimal_response&no_attributes`,
  );
  expect(cache.series("sensor.c")).toEqual([4]);
});

test("reuses cached history for repeated ensure calls", async () => {
  const ws = vi.fn(async (_message: HistoryWsRequest) => ({
    "sensor.a": [{ s: "1", lu: 1763000000 }],
  }));
  const cache = new HistoryCache(makeHass(ws), () => FIXED);

  await cache.ensure(["sensor.a"], 24);
  await cache.ensure(["sensor.a"], 24);

  expect(ws).toHaveBeenCalledTimes(1);
  expect(cache.series("sensor.a")).toEqual([1]);
});

test("shares one in-flight request between concurrent ensure calls", async () => {
  let resolve!: (value: unknown) => void;
  const ws = vi.fn(
    (_message: HistoryWsRequest) =>
      new Promise<unknown>((done) => {
        resolve = done;
      }),
  );
  const cache = new HistoryCache(makeHass(ws), () => FIXED);

  const first = cache.ensure(["sensor.a"], 24);
  const second = cache.ensure(["sensor.a"], 24);
  resolve({ "sensor.a": [{ s: "7", lu: 1763000000 }] });
  await Promise.all([first, second]);

  expect(ws).toHaveBeenCalledTimes(1);
  expect(cache.series("sensor.a")).toEqual([7]);
});

test("window filters cached rows by timestamp", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const ws = vi.fn(async (_message: HistoryWsRequest) => ({
    "sensor.d": [
      { s: "40", lu: ago(40 * 86400000) },
      { s: "20", lu: ago(20 * 86400000) },
      { s: "10", lu: ago(10 * 86400000) },
      { s: "2", lu: ago(2 * 86400000) },
      { s: "1", lu: ago(3600000) },
    ],
  }));
  const cache = new HistoryCache(makeHass(ws));

  await cache.ensure(["sensor.d"], 24 * 365);

  expect(cache.window("sensor.d", 30)).toEqual([20, 10, 2, 1]);
  expect(cache.window("sensor.d", 1)).toEqual([1]);
});

test("keeps a longer cached range when a shorter one is fetched later", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
  const ws = vi
    .fn()
    .mockResolvedValueOnce({
      "sensor.a": [
        { s: "1", lu: 1763000000 },
        { s: "2", lu: 1763003600 },
      ],
    })
    .mockResolvedValueOnce({ "sensor.a": [{ s: "9", lu: 1763007200 }] });
  const cache = new HistoryCache(makeHass(ws));

  await cache.ensure(["sensor.a"], 48);
  vi.setSystemTime(new Date("2026-11-13T10:06:00Z"));
  await cache.ensure(["sensor.a"], 12);

  expect(ws).toHaveBeenCalledTimes(2);
  expect(cache.series("sensor.a")).toEqual([1, 2]);
});

test("downsamples long series to at most 90 points", async () => {
  const base = Math.floor(FIXED.getTime() / 1000);
  const rows: HistoryRow[] = Array.from({ length: 200 }, (_, index) => ({
    s: String(index),
    lu: base - 200 + index,
  }));
  const cache = new HistoryCache(
    makeHass(async () => ({ "sensor.long": rows })),
    () => FIXED,
  );

  await cache.ensure(["sensor.long"], 24);

  const series = cache.series("sensor.long");
  expect(series).toHaveLength(90);
  expect(series.every((value) => value !== null)).toBe(true);
  expect(cache.window("sensor.long", 1)).toHaveLength(90);
});

test("notifies subscribers when new rows are cached", async () => {
  const hass = makeHass(async () => ({
    "sensor.d": [{ s: "5", lu: 1763000000 }],
  }));
  const cache = new HistoryCache(hass, () => FIXED);
  const listener = vi.fn();
  const unsubscribe = cache.subscribe(listener);
  const before = cache.getVersion();

  await cache.ensure(["sensor.d"], 24);

  expect(listener).toHaveBeenCalledTimes(1);
  expect(cache.getVersion()).toBe(before + 1);
  expect(cache.series("sensor.d")).toEqual([5]);

  unsubscribe();
  await cache.ensure(["sensor.d"], 48);
  expect(listener).toHaveBeenCalledTimes(1);
});

test("batches large history requests instead of sending one giant payload", async () => {
  const calls: HistoryWsRequest[] = [];
  const hass = makeHass(async (message) => {
    calls.push(message);
    return Object.fromEntries(
      (message.entity_ids ?? []).map((id) => [
        id,
        [{ s: "7", lu: 1763000000 }],
      ]),
    );
  });
  const cache = new HistoryCache(hass, () => FIXED);
  const ids = Array.from({ length: 17 }, (_, index) => `sensor.batch_${index}`);

  await cache.ensure(ids, 24);

  expect(calls).toHaveLength(5);
  expect(calls.map((call) => call.entity_ids.length)).toEqual([
    4, 4, 4, 4, 1,
  ]);
  expect(cache.series("sensor.batch_0")).toEqual([7]);
  expect(cache.series("sensor.batch_8")).toEqual([7]);
  expect(cache.series("sensor.batch_16")).toEqual([7]);
});
