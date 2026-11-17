import { afterEach, expect, test, vi } from "vitest";
import {
  HistoryCache,
  type HistoryHass,
  type HistoryRow,
  type HistoryWsRequest,
} from "../src/data/history";

const FIXED = new Date("2026-11-13T10:00:00+01:00");

const nonNull = (values: Array<number | null>): number[] => {
  return values.filter((value): value is number => value !== null);
};

const makeHass = (
  callWS: HistoryHass["callWS"],
  callApi: HistoryHass["callApi"] = async () => [],
): HistoryHass => {
  return { callWS, callApi };
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

/** Promise plus its `resolve`, so a test can hold a request open. */
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

/** Let promise continuations queued by a release run to completion. */
const flushMicrotasks = async (ticks = 16): Promise<void> => {
  for (let tick = 0; tick < ticks; tick += 1) await Promise.resolve();
};

afterEach(() => {
  vi.useRealTimers();
});

test("reads object responses with numeric timestamps", async () => {
  const calls: HistoryWsRequest[] = [];
  const hass = makeHass(async (message) => {
    calls.push(message);
    return {
      "sensor.a": [
        { s: "1", lu: Math.floor(FIXED.getTime() / 1000) - 7200 },
        { s: "unavailable", lu: Math.floor(FIXED.getTime() / 1000) - 3600 },
      ],
    };
  });
  const cache = new HistoryCache(hass, () => FIXED);

  await cache.ensure(["sensor.a"], 24);

  expect(nonNull(cache.series("sensor.a"))).toEqual([1]);
  expect(cache.series("sensor.a")).toHaveLength(90);
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
      { state: "3", last_updated: "2026-11-13T09:59:00+01:00" },
    ],
  ]);
  const cache = new HistoryCache(hass, () => FIXED);

  await cache.ensure(["sensor.b"], 12);

  expect(nonNull(cache.series("sensor.b"))).toEqual([2.5, 3]);
  expect(cache.raw("sensor.b")[0]).toMatchObject({
    state: "2.5",
    last_updated: "2026-11-13T08:00:00+01:00",
  });
});

test("retries the WebSocket once, then falls back to REST", async () => {
  const ws = vi.fn(async (_message: HistoryWsRequest) => {
    throw new Error("ws unavailable");
  });
  const api = vi.fn(async (_method: string, _path: string) => [
    [{ s: "4", lu: "2026-11-13T09:30:00+01:00" }],
  ]);
  const cache = new HistoryCache(makeHass(ws, api), () => FIXED, {
    retryDelayMs: 0,
  });
  const start = new Date(FIXED.getTime() - 6 * 60 * 60 * 1000).toISOString();

  await cache.ensure(["sensor.c"], 6);

  expect(ws).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api.mock.calls[0][0]).toBe("GET");
  expect(api.mock.calls[0][1]).toBe(
    `history/period/${encodeURIComponent(start)}?filter_entity_id=sensor.c` +
      `&end_time=${encodeURIComponent(FIXED.toISOString())}` +
      `&minimal_response&no_attributes`,
  );
  expect(nonNull(cache.series("sensor.c"))).toEqual([4]);
  expect(cache.status("sensor.c")).toBe("ready");
});

test("times out a hung recorder and still resolves the request", async () => {
  const ws = vi.fn(() => new Promise<unknown>(() => {}));
  const api = vi.fn(() => new Promise<unknown>(() => {}));
  const cache = new HistoryCache(makeHass(ws, api), () => FIXED, {
    timeoutMs: 5,
    retryDelayMs: 0,
  });

  // Before the timeout, one wedged socket kept the entity at `loading` and
  // blocked every later refresh; the ensure call must now settle by itself.
  await cache.ensure(["sensor.hung"], 24);

  expect(ws).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenCalledTimes(1);
  expect(cache.status("sensor.hung")).toBe("failed");
});

test("times out a hung WebSocket but loads from REST", async () => {
  const ws = vi.fn(() => new Promise<unknown>(() => {}));
  const api = vi.fn(async (_method: string, _path: string) => [
    { s: "21", lu: "2026-11-13T09:30:00+01:00" },
  ]);
  const cache = new HistoryCache(makeHass(ws, api), () => FIXED, {
    timeoutMs: 5,
    retryDelayMs: 0,
  });

  await cache.ensure(["sensor.slow"], 24);

  expect(api).toHaveBeenCalledTimes(1);
  expect(nonNull(cache.series("sensor.slow"))).toEqual([21]);
  expect(cache.status("sensor.slow")).toBe("ready");
});

test("reports failed when every transport errors", async () => {
  const ws = vi.fn(async (_message: HistoryWsRequest) => {
    throw new Error("ws down");
  });
  const api = vi.fn(async (_method: string, _path: string) => {
    throw new Error("rest down");
  });
  const cache = new HistoryCache(makeHass(ws, api), () => FIXED, {
    retryDelayMs: 0,
  });

  await cache.ensure(["sensor.down"], 24);

  expect(ws).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenCalledTimes(1);
  expect(cache.status("sensor.down")).toBe("failed");
  expect(cache.raw("sensor.down")).toEqual([]);
});

test("a later successful refresh clears failed", async () => {
  let recorderBack = false;
  const ws = vi.fn(async (_message: HistoryWsRequest) => {
    throw new Error("ws down");
  });
  const api = vi.fn(async (_method: string, _path: string) => {
    if (!recorderBack) throw new Error("rest down");
    return [{ s: "8", lu: "2026-11-13T09:30:00+01:00" }];
  });
  const cache = new HistoryCache(makeHass(ws, api), () => FIXED, {
    retryDelayMs: 0,
  });

  await cache.ensure(["sensor.recover"], 24);
  expect(cache.status("sensor.recover")).toBe("failed");

  recorderBack = true;
  await cache.ensure(["sensor.recover"], 24);

  expect(cache.status("sensor.recover")).toBe("ready");
  expect(nonNull(cache.series("sensor.recover"))).toEqual([8]);
});

test("reuses cached history for repeated ensure calls", async () => {
  const ws = vi.fn(async (_message: HistoryWsRequest) => ({
    "sensor.a": [{ s: "1", lu: Math.floor(FIXED.getTime() / 1000) - 3600 }],
  }));
  const cache = new HistoryCache(makeHass(ws), () => FIXED);

  await cache.ensure(["sensor.a"], 24);
  await cache.ensure(["sensor.a"], 24);

  expect(ws).toHaveBeenCalledTimes(1);
  expect(nonNull(cache.series("sensor.a"))).toEqual([1]);
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
  resolve({
    "sensor.a": [{ s: "7", lu: Math.floor(FIXED.getTime() / 1000) - 3600 }],
  });
  await Promise.all([first, second]);

  expect(ws).toHaveBeenCalledTimes(1);
  expect(nonNull(cache.series("sensor.a"))).toEqual([7]);
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

  expect(nonNull(cache.window("sensor.d", 30))).toEqual([20, 10, 2, 1]);
  expect(nonNull(cache.window("sensor.d", 1))).toEqual([1]);
});

test("merges a shorter refresh into a longer cached range", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
  const ws = vi
    .fn()
    .mockResolvedValueOnce({
      "sensor.a": [
        { s: "1", lu: Math.floor(FIXED.getTime() / 1000) - 7200 },
        { s: "2", lu: Math.floor(FIXED.getTime() / 1000) - 3600 },
      ],
    })
    .mockResolvedValueOnce({
      "sensor.a": [{ s: "9", lu: Math.floor(FIXED.getTime() / 1000) - 1800 }],
    });
  const cache = new HistoryCache(makeHass(ws));

  await cache.ensure(["sensor.a"], 48);
  vi.setSystemTime(new Date("2026-11-13T10:06:00Z"));
  await cache.ensure(["sensor.a"], 12);

  expect(ws).toHaveBeenCalledTimes(2);
  expect(nonNull(cache.series("sensor.a"))).toEqual([1, 2, 9]);
});

test("maps long series into 90 equal time buckets", async () => {
  const base = FIXED.getTime();
  const rows: HistoryRow[] = Array.from({ length: 240 }, (_, index) => ({
    s: String(index),
    lu: (base - (240 - index) * 6 * 60 * 1000) / 1000,
  }));
  const cache = new HistoryCache(
    makeHass(async () => ({ "sensor.long": rows })),
    () => FIXED,
  );

  await cache.ensure(["sensor.long"], 24);

  const series = cache.series("sensor.long");
  expect(series).toHaveLength(90);
  expect(nonNull(series).length).toBeGreaterThan(0);
  expect(cache.window("sensor.long", 1)).toHaveLength(90);
});

test("fills a sparse solar night with zero instead of a diagonal ramp", async () => {
  const now = new Date("2026-11-14T14:00:00+01:00");
  const rows: HistoryRow[] = [
    { s: "0", lu: new Date("2026-11-13T16:52:00+01:00").getTime() / 1000 },
    { s: "18.8", lu: new Date("2026-11-14T07:05:00+01:00").getTime() / 1000 },
  ];
  const cache = new HistoryCache(
    makeHass(async () => ({ "sensor.solar": rows })),
    () => now,
  );

  await cache.ensure(["sensor.solar"], 24);

  const series = cache.series("sensor.solar", { fill: 0, buckets: 96 });
  expect(series).toHaveLength(96);
  expect(series.filter((value) => value === 0).length).toBeGreaterThan(24);
  expect(series.some((value) => value !== null && value > 10)).toBe(true);
});

test("notifies subscribers when new rows are cached", async () => {
  const hass = makeHass(async () => ({
    "sensor.d": [{ s: "5", lu: Math.floor(FIXED.getTime() / 1000) - 3600 }],
  }));
  const cache = new HistoryCache(hass, () => FIXED);
  const listener = vi.fn();
  const unsubscribe = cache.subscribe(listener);
  const before = cache.getVersion();

  await cache.ensure(["sensor.d"], 24);

  expect(listener).toHaveBeenCalledTimes(1);
  expect(cache.getVersion()).toBe(before + 1);
  expect(nonNull(cache.series("sensor.d"))).toEqual([5]);

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
        [{ s: "7", lu: Math.floor(FIXED.getTime() / 1000) - 3600 }],
      ]),
    );
  });
  const cache = new HistoryCache(hass, () => FIXED);
  const ids = Array.from({ length: 17 }, (_, index) => `sensor.batch_${index}`);

  await cache.ensure(ids, 24);

  expect(calls).toHaveLength(5);
  expect(calls.map((call) => call.entity_ids.length)).toEqual([4, 4, 4, 4, 1]);
  expect(nonNull(cache.series("sensor.batch_0"))).toEqual([7]);
  expect(nonNull(cache.series("sensor.batch_8"))).toEqual([7]);
  expect(nonNull(cache.series("sensor.batch_16"))).toEqual([7]);
});

test("runs history batches concurrently within the pool limit", async () => {
  // Mirrors `FETCH_CONCURRENCY` in `src/data/history.ts`: startup must neither
  // fall back to a serial waterfall nor fan out past the recorder budget.
  const pool = 4;
  const pending: Array<{ request: Deferred<unknown>; ids: string[] }> = [];
  let active = 0;
  let maxActive = 0;
  const ws = vi.fn((message: HistoryWsRequest) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    const request = deferred<unknown>();
    pending.push({ request, ids: message.entity_ids });
    // Decrement only once the batch is released, so `active` counts exactly
    // the requests the cache is waiting on.
    return request.promise.finally(() => {
      active -= 1;
    });
  });
  const cache = new HistoryCache(makeHass(ws), () => FIXED);
  const ids = Array.from({ length: 20 }, (_, index) => `sensor.pool_${index}`);

  const done = cache.ensure(ids, 24);

  // Twenty entities are five batches; the pool starts four before settling.
  await flushMicrotasks();
  expect(ws).toHaveBeenCalledTimes(pool);
  expect(active).toBe(pool);
  expect(maxActive).toBe(pool);

  // Release each wave so the fifth batch can take a free slot.
  for (let round = 0; round < 8 && pending.length; round += 1) {
    pending.splice(0).forEach(({ request, ids: batchIds }) => {
      request.resolve(
        Object.fromEntries(
          batchIds.map((id) => [
            id,
            [{ s: "7", lu: Math.floor(FIXED.getTime() / 1000) - 3600 }],
          ]),
        ),
      );
    });
    await flushMicrotasks();
  }
  await done;

  expect(ws).toHaveBeenCalledTimes(5);
  expect(maxActive).toBeGreaterThan(1);
  expect(maxActive).toBeLessThanOrEqual(pool);
  ids.forEach((id) => expect(nonNull(cache.series(id))).toEqual([7]));
});

test("aligns explicit calendar-day windows and fills empty buckets", async () => {
  const midnight = new Date("2026-11-13T00:00:00+01:00").getTime();
  const rows: HistoryRow[] = [
    { s: "10", lu: midnight / 1000 },
    { s: "20", lu: (midnight + 12 * 60 * 60 * 1000) / 1000 },
  ];
  const cache = new HistoryCache(
    makeHass(async () => ({ "sensor.day": rows })),
    () => new Date("2026-11-13T23:00:00+01:00"),
  );

  await cache.ensure(["sensor.day"], 24);

  const values = cache.series("sensor.day", {
    start: midnight,
    end: midnight + 24 * 60 * 60 * 1000,
    buckets: 96,
    fill: 0,
  });

  expect(values).toHaveLength(96);
  expect(values[0]).toBe(10);
  expect(values[48]).toBe(20);
  expect(values[90]).toBe(0);
});

test("holds the last known value across sparse temperature gaps", async () => {
  const midnight = new Date("2026-11-13T00:00:00+01:00").getTime();
  const rows: HistoryRow[] = [
    { s: "10", lu: midnight / 1000 },
    { s: "20", lu: (midnight + 12 * 60 * 60 * 1000) / 1000 },
  ];
  const cache = new HistoryCache(
    makeHass(async () => ({ "sensor.room": rows })),
    () => new Date("2026-11-13T23:00:00+01:00"),
  );

  await cache.ensure(["sensor.room"], 24);

  const values = cache.series("sensor.room", {
    start: midnight,
    end: midnight + 24 * 60 * 60 * 1000,
    buckets: 96,
    fill: "hold",
  });

  expect(values[0]).toBe(10);
  expect(values[1]).toBe(10);
  expect(values[48]).toBe(20);
  expect(values[90]).toBe(20);
});

test("reports empty when a completed fetch omits the entity", async () => {
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  const ws = vi.fn((_message: HistoryWsRequest) => first.promise);
  const cache = new HistoryCache(makeHass(ws), () => FIXED);

  const done = cache.ensure(["sensor.omitted"], 24);
  expect(cache.status("sensor.omitted")).toBe("loading");
  first.resolve({ "sensor.other": [] });
  await done;

  // The recorder answered, but not for the requested entity: that is empty,
  // not idle, or a chart would show loading forever.
  expect(cache.status("sensor.omitted")).toBe("empty");
  expect(cache.raw("sensor.omitted")).toEqual([]);

  // A refresh clears the settled answer while the new request is in flight.
  ws.mockImplementationOnce(() => second.promise);
  const refresh = cache.ensure(["sensor.omitted"], 48);
  expect(cache.status("sensor.omitted")).toBe("loading");
  second.resolve({});
  await refresh;
  expect(cache.status("sensor.omitted")).toBe("empty");
});

test("fetches an explicit historical window and tracks its coverage", async () => {
  const calls: HistoryWsRequest[] = [];
  const ws = vi.fn(async (message: HistoryWsRequest) => {
    calls.push(message);
    return {
      "sensor.past": [
        {
          s: "18",
          lu: Math.floor(new Date("2026-11-10T12:00:00Z").getTime() / 1000),
        },
      ],
    };
  });
  const cache = new HistoryCache(makeHass(ws), () => FIXED);
  const start = new Date("2026-11-10T00:00:00Z").getTime();
  const end = new Date("2026-11-11T00:00:00Z").getTime();

  expect(cache.rangeStatus("sensor.past", start, end)).toBe("idle");
  await cache.ensureRange(["sensor.past"], start, end);

  expect(calls).toHaveLength(1);
  expect(calls[0].start_time).toBe(new Date(start).toISOString());
  expect(calls[0].end_time).toBe(new Date(end).toISOString());
  expect(cache.rangeStatus("sensor.past", start, end)).toBe("ready");
  expect(nonNull(cache.series("sensor.past", { start, end }))).toEqual([18]);

  // The same window is already answered; a second call must not re-request it.
  await cache.ensureRange(["sensor.past"], start, end);
  expect(calls).toHaveLength(1);
});

test("marks a purged window as empty instead of loading forever", async () => {
  const ws = vi.fn(async () => ({}));
  const cache = new HistoryCache(makeHass(ws), () => FIXED);
  const start = new Date("2026-10-01T00:00:00Z").getTime();
  const end = new Date("2026-10-02T00:00:00Z").getTime();

  await cache.ensureRange(["sensor.purged"], start, end);

  expect(cache.rangeStatus("sensor.purged", start, end)).toBe("empty");
  expect(cache.status("sensor.purged")).toBe("empty");
  expect(cache.raw("sensor.purged")).toEqual([]);
});

test("reports loading for an uncovered window while its request is in flight", async () => {
  const pending = deferred<unknown>();
  const ws = vi.fn(() => pending.promise);
  const cache = new HistoryCache(makeHass(ws), () => FIXED);
  const start = new Date("2026-11-10T00:00:00Z").getTime();
  const end = new Date("2026-11-11T00:00:00Z").getTime();

  const load = cache.ensureRange(["sensor.past"], start, end);
  expect(cache.rangeStatus("sensor.past", start, end)).toBe("loading");

  pending.resolve({});
  await load;
  expect(cache.rangeStatus("sensor.past", start, end)).toBe("empty");
});

test("honours an explicit end for window()", async () => {
  const ws = vi.fn(async () => ({
    "sensor.window": [
      {
        s: "1",
        lu: Math.floor(new Date("2026-11-10T12:00:00Z").getTime() / 1000),
      },
      {
        s: "2",
        lu: Math.floor(new Date("2026-11-12T12:00:00Z").getTime() / 1000),
      },
    ],
  }));
  const cache = new HistoryCache(makeHass(ws), () => FIXED);

  await cache.ensure(["sensor.window"], 24 * 10);
  const end = new Date("2026-11-11T00:00:00Z").getTime();

  expect(nonNull(cache.window("sensor.window", 1, { end }))).toEqual([1]);
});

test("reports idle, loading, empty, and ready status transitions", async () => {
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  const third = deferred<unknown>();
  const ws = vi.fn((_message: HistoryWsRequest) => first.promise);
  const cache = new HistoryCache(makeHass(ws), () => FIXED);
  const row = { s: "5", lu: Math.floor(FIXED.getTime() / 1000) - 3600 };

  expect(cache.status("sensor.status")).toBe("idle");

  const empty = cache.ensure(["sensor.status"], 24);
  expect(cache.status("sensor.status")).toBe("loading");
  first.resolve({ "sensor.status": [] });
  await empty;
  expect(cache.status("sensor.status")).toBe("empty");

  ws.mockImplementationOnce(() => second.promise);
  const load = cache.ensure(["sensor.status"], 48);
  expect(cache.status("sensor.status")).toBe("loading");
  second.resolve({ "sensor.status": [row] });
  await load;
  expect(cache.status("sensor.status")).toBe("ready");

  // A refresh for a longer window keeps the cached rows available, so the
  // status stays ready while the request is in flight.
  ws.mockImplementationOnce(() => third.promise);
  const refresh = cache.ensure(["sensor.status"], 72);
  expect(cache.status("sensor.status")).toBe("ready");
  third.resolve({ "sensor.status": [row] });
  await refresh;
  expect(cache.status("sensor.status")).toBe("ready");
});
