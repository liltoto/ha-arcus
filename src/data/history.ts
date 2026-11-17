/**
 * Minimal structural view of the Home Assistant object.
 *
 * Kept local to this module so the history cache does not depend on the
 * (still unfinished) shared types module.
 */
import { startOfDay } from "../range";

export interface HistoryHass {
  callWS(message: HistoryWsRequest): Promise<unknown>;
  callApi(method: string, path: string, data?: unknown): Promise<unknown>;
}

export interface HistoryWsRequest {
  type: "history/history_during_period";
  start_time: string;
  end_time: string;
  entity_ids: string[];
  minimal_response: true;
  no_attributes: true;
  significant_changes_only: false;
}

/**
 * A history row as returned by `history/history_during_period` with
 * `minimal_response` (`s`/`lu`/`lc`) or by the REST API in full form
 * (`state`/`last_updated`/`last_changed`).
 */
export interface SeriesOptions {
  /** Number of time buckets across the window. */
  buckets?: number;
  /** Explicit window in hours; defaults to the last 24 hours. */
  hours?: number;
  /** Explicit window start in epoch milliseconds. */
  start?: number;
  /** Explicit window end in epoch milliseconds. */
  end?: number;
  /**
   * Value for empty time buckets. `"hold"` carries the last known value
   * forward (correct for temperature and other persistent states); null keeps
   * a visible gap.
   */
  fill?: number | "hold" | null;
}

/** A half-open window whose rows have been requested from the recorder. */
interface Coverage {
  start: number;
  end: number;
}

export interface HistoryRow {
  s?: string | number | null;
  lu?: string | number | null;
  lc?: string | number | null;
  state?: string | number | null;
  last_updated?: string | number | null;
  last_changed?: string | number | null;
}

interface CacheEntry {
  rows: HistoryRow[];
  fetchedAt: number;
  /** Windows already answered by the recorder, merged and sorted. */
  coverage: Coverage[];
}

/**
 * How far an entity's history has progressed. `ready` means rows are cached,
 * `loading` means a request is in flight, `empty` means a request finished
 * without rows, `failed` means every transport errored or timed out, and
 * `idle` means nothing has been requested yet. `failed` is deliberately
 * distinct from `empty`: a recorder that is down must not read as "this
 * sensor has never had history".
 */
export type HistoryStatus = "idle" | "loading" | "ready" | "empty" | "failed";

const CACHE_MS = 5 * 60 * 1000;

/**
 * Keep each WebSocket/REST history request small. A home-sized dashboard asks
 * for dozens of entities, and a single request can exceed HA recorder
 * guardrails or the WebSocket response budget when busy sensors (load, grid)
 * return thousands of rows each.
 */
const FETCH_BATCH = 4;

/**
 * How many batches may be in flight at once. Startup asks for every entity on
 * the dashboard, so waiting for one batch before starting the next turned the
 * first paint into a serial request waterfall; an unbounded fan-out would
 * instead flood the recorder. Four batches (sixteen entities) matches the
 * per-request budget above without starving the recorder.
 */
const FETCH_CONCURRENCY = 4;

/**
 * Per-transport request budget. A recorder that stops answering (a restarting
 * container, a wedged SQLite writer) leaves `callWS` pending forever, which
 * used to pin the entity at `loading` and block every later refresh. The
 * timeout turns a hung socket into a normal failure that the next clock tick
 * can retry.
 */
const FETCH_TIMEOUT_MS = 10_000;

/** One retry covers a WebSocket reconnect window without delaying REST long. */
const RETRY_DELAY_MS = 400;

export interface HistoryCacheOptions {
  /** Per-request budget in milliseconds; `0` disables the timeout. */
  timeoutMs?: number;
  /** Pause before the single WebSocket retry. */
  retryDelayMs?: number;
}

/** Reject when `work` has not settled within `ms`; the work keeps running. */
const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> => {
  if (!(ms > 0)) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Arcus: history request timed out"));
    }, ms);
  });
  return Promise.race([work, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
};

const pause = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/** Opt-in console diagnostics: set `localStorage.arcus-debug = "1"`. */
const debugHistory = (message: string, details: unknown): void => {
  try {
    if (globalThis.localStorage?.getItem("arcus-debug") === "1") {
      console.debug(`[arcus history] ${message}`, details);
    }
  } catch {
    /* localStorage can be unavailable in embedded browsers. */
  }
};
const DAY_MS = 24 * 60 * 60 * 1000;

/** Numeric epoch seconds or an ISO/numeric date string -> milliseconds. */
const rowTimestamp = (row: HistoryRow): number => {
  const raw = row.lu ?? row.last_updated ?? row.last_changed ?? row.lc;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw * 1000 : 0;
  if (typeof raw === "string") {
    if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) * 1000;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/** State value -> number, preserving gaps as `null`. */
export const rowValue = (row: HistoryRow): number | null => {
  const raw = row.s ?? row.state;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value || value === "unavailable" || value === "unknown") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
};

/**
 * Merge a refresh into the cached rows. A shorter live-tail request must not
 * throw away an older multi-day window, so rows are unioned by timestamp
 * (the newer row wins) instead of replacing the array.
 */
const mergeRows = (
  previous: HistoryRow[],
  next: HistoryRow[],
): HistoryRow[] => {
  if (!next.length) return previous;
  if (!previous.length) {
    return next.slice().sort((a, b) => rowTimestamp(a) - rowTimestamp(b));
  }
  const byTime = new Map<number, HistoryRow>();
  const unknown = new Map<string, HistoryRow>();
  const add = (row: HistoryRow): void => {
    const timestamp = rowTimestamp(row);
    if (timestamp) {
      byTime.set(timestamp, row);
      return;
    }
    unknown.set(JSON.stringify(row), row);
  };
  previous.forEach(add);
  next.forEach(add);
  return [
    ...unknown.values(),
    ...[...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row),
  ];
};

const mergeCoverage = (intervals: Coverage[], next: Coverage): Coverage[] => {
  const all = [...intervals, next]
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);
  const merged: Coverage[] = [];
  for (const interval of all) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
};

const sameCoverage = (a: Coverage[], b: Coverage[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every(
    (interval, index) =>
      interval.start === b[index].start && interval.end === b[index].end,
  );
};

/**
 * Per-entity history cache used by the cards and sheets.
 *
 * A fetch is considered fresh for five minutes, in-flight requests are shared
 * per entity, and a request for a shorter range never replaces a longer one
 * that is already cached. A WebSocket failure is retried once and then falls
 * back to the REST history endpoint; when both transports fail or time out the
 * entity reports `failed` instead of a misleading empty series.
 */
export class HistoryCache {
  private readonly hass: HistoryHass;
  private readonly now: () => Date;
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<void>>();
  /**
   * Entities whose most recent fetch finished without cached rows. The
   * recorder can omit an entity entirely (or both transports can fail), so
   * the absence of a cache entry alone cannot distinguish "never asked" from
   * "asked, nothing came back".
   */
  private readonly settled = new Set<string>();
  /** Entities whose last request errored on every transport. */
  private readonly failed = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  constructor(
    hass: HistoryHass,
    now: () => Date = () => new Date(),
    options: HistoryCacheOptions = {},
  ) {
    this.hass = hass;
    this.now = now;
    this.timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
    this.retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  }

  /**
   * Stable subscription used by `useSyncExternalStore`. The version changes
   * only when cached rows change, so React charts re-render when history
   * arrives or is refreshed.
   */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getVersion = (): number => this.version;

  private notify(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  /** Load up to `hours` of history ending now for the given entities. */
  async ensure(entityIds: string[], hours: number): Promise<void> {
    const end = this.now().getTime();
    await this.ensureRange(entityIds, end - hours * 60 * 60 * 1000, end);
  }

  /**
   * Load exactly the half-open window `[start, end)` for the given entities.
   *
   * A date picker must not download everything from now back to a day a year
   * ago, so the request carries the selected window instead of an "hours from
   * now" length. Coverage is tracked per entity, and a successful answer for
   * an entity with no rows still marks the window as answered so a purged day
   * resolves to `empty` rather than a permanent `loading`.
   */
  async ensureRange(
    entityIds: string[],
    start: number,
    end: number,
  ): Promise<void> {
    const ids = [
      ...new Set(
        entityIds.filter((id) => typeof id === "string" && id.length > 0),
      ),
    ];
    if (!ids.length) return;

    const nowMs = this.now().getTime();
    const endMs = Math.min(end, nowMs);
    const startMs = Math.min(start, endMs);
    if (startMs >= endMs) return;

    const pending = ids
      .map((id) => this.inflight.get(id))
      .filter((request): request is Promise<void> => Boolean(request));
    if (pending.length) await Promise.allSettled(pending);

    const need = ids.filter((id) =>
      this.needsRange(id, startMs, endMs, this.now().getTime()),
    );
    if (!need.length) return;

    // A new request makes the previous "nothing came back" answer stale.
    need.forEach((id) => {
      this.settled.delete(id);
      this.failed.delete(id);
    });
    const request = this.fetch(need, startMs, endMs);
    need.forEach((id) => this.inflight.set(id, request));
    try {
      await request;
    } finally {
      need.forEach((id) => {
        if (this.inflight.get(id) === request) this.inflight.delete(id);
      });
    }
  }

  /**
   * Cached series mapped into equal time buckets, not equal row counts.
   *
   * The recorder stores only state changes. A solar sensor may report 0 at
   * sunset and then nothing until sunrise; index-based downsampling would put
   * those two rows next to each other and draw a ramp across the night. Time
   * bucketing keeps the night in place, so `fill: 0` produces a flat zero line
   * and `fill: null` keeps an honest gap.
   */
  series(entityId: string, options: SeriesOptions = {}): Array<number | null> {
    const entry = this.cache.get(entityId);
    if (!entry) return [];
    const now = this.now().getTime();
    const end = options.end ?? now;
    const start = options.start ?? end - (options.hours ?? 24) * 60 * 60 * 1000;
    return this.bucket(
      entry.rows,
      start,
      end,
      options.buckets ?? 90,
      options.fill ?? null,
    );
  }

  /**
   * Cached series for the `days` ending at `options.end` (now by default).
   * Historical chart windows pass an explicit end so they do not drift.
   */
  window(
    entityId: string,
    days: number,
    options: SeriesOptions = {},
  ): Array<number | null> {
    const entry = this.cache.get(entityId);
    if (!entry) return [];
    const end = options.end ?? this.now().getTime();
    const start = options.start ?? end - days * DAY_MS;
    return this.bucket(
      entry.rows,
      start,
      end,
      options.buckets ?? 90,
      options.fill ?? null,
    );
  }

  private bucket(
    rows: HistoryRow[],
    start: number,
    end: number,
    buckets: number,
    fill: number | "hold" | null,
  ): Array<number | null> {
    if (end <= start) return [];
    const count = Math.max(1, Math.round(buckets));
    const width = (end - start) / count;
    const sums = Array.from({ length: count }, () => 0);
    const counts = Array.from({ length: count }, () => 0);
    const nulls = Array.from({ length: count }, () => false);
    let hasValue = false;

    for (const row of rows) {
      const timestamp = rowTimestamp(row);
      // Windows are half-open: a row exactly at `end` belongs to the next one.
      if (!timestamp || timestamp < start || timestamp >= end) continue;
      const index = Math.min(
        count - 1,
        Math.max(0, Math.floor((timestamp - start) / width)),
      );
      const value = rowValue(row);
      if (value === null) {
        nulls[index] = true;
        continue;
      }
      sums[index] += value;
      counts[index] += 1;
      hasValue = true;
    }

    // Do not fabricate a full flat series for an entity with no history at all.
    if (!hasValue) return [];

    let held: number | null = null;
    return counts.map((bucketCount, index) => {
      if (bucketCount) {
        held = sums[index] / bucketCount;
        return held;
      }
      if (nulls[index]) {
        // An explicit unavailable/unknown state breaks the hold.
        held = null;
        return null;
      }
      return fill === "hold" ? held : fill;
    });
  }

  /** Raw cached rows for an entity. */
  raw(entityId: string): HistoryRow[] {
    return this.cache.get(entityId)?.rows.slice() ?? [];
  }

  /**
   * Current load state for one entity. Cached rows win over an in-flight
   * refresh so a chart keeps drawing the previous series while new history
   * arrives.
   */
  status(entityId: string): HistoryStatus {
    const entry = this.cache.get(entityId);
    if (entry?.rows.length) return "ready";
    if (this.inflight.has(entityId)) return "loading";
    if (this.failed.has(entityId)) return "failed";
    if (entry || this.settled.has(entityId)) return "empty";
    return "idle";
  }

  /**
   * Load state for a specific window. `status()` is per entity, so an entity
   * with rows from another window would otherwise read as `ready` and the
   * chart would draw a misleading empty series while the requested day is
   * still loading.
   */
  rangeStatus(entityId: string, start: number, end: number): HistoryStatus {
    const endMs = Math.min(end, this.now().getTime());
    if (endMs <= start || this.covers(entityId, start, endMs)) {
      return this.status(entityId);
    }
    if (this.inflight.has(entityId)) return "loading";
    if (this.failed.has(entityId)) return "failed";
    return "idle";
  }

  private covers(entityId: string, start: number, end: number): boolean {
    const entry = this.cache.get(entityId);
    return Boolean(
      entry?.coverage.some(
        (interval) => interval.start <= start && interval.end >= end,
      ),
    );
  }

  private needsRange(
    entityId: string,
    start: number,
    end: number,
    nowMs: number,
  ): boolean {
    const entry = this.cache.get(entityId);
    if (!entry) return true;

    // Past windows are immutable, so only a window that includes today needs
    // the TTL refresh. A purged day must not be re-requested on every open.
    const liveTail = end > startOfDay(nowMs);
    if (liveTail && nowMs - entry.fetchedAt > CACHE_MS) return true;
    if (this.covers(entityId, start, end)) return false;
    if (!entry.coverage.length) return true;

    const earliest = Math.min(
      ...entry.coverage.map((interval) => interval.start),
    );
    // Extending the window further back always needs a request.
    if (start < earliest) return true;

    const latest = Math.max(...entry.coverage.map((interval) => interval.end));
    if (end > latest) {
      // A live window keeps growing as the clock advances. The TTL above
      // decides when its tail refreshes; requiring exact coverage here would
      // refetch on every 20-second clock tick.
      return !liveTail;
    }
    // Within the outer bounds: a hole between covered intervals.
    return true;
  }

  private async fetch(
    entityIds: string[],
    startMs: number,
    endMs: number,
  ): Promise<void> {
    const batches: string[][] = [];
    for (let index = 0; index < entityIds.length; index += FETCH_BATCH) {
      batches.push(entityIds.slice(index, index + FETCH_BATCH));
    }

    // Worker pool: at most FETCH_CONCURRENCY batches are in flight, and every
    // batch is still started in request order.
    let next = 0;
    let failedAny = false;
    const worker = async (): Promise<void> => {
      while (next < batches.length) {
        const batch = batches[next++];
        const answered = await this.fetchBatch(batch, startMs, endMs);
        batch.forEach((id) => {
          if (answered) this.failed.delete(id);
          else this.failed.add(id);
        });
        if (!answered) failedAny = true;
      }
    };
    const workers = Math.min(FETCH_CONCURRENCY, batches.length);
    try {
      await Promise.all(Array.from({ length: workers }, worker));
    } finally {
      // The recorder may omit entities without history, and both transports
      // may fail. Either way the request is finished, so status must stop
      // saying "loading" even when no cache entry was written.
      entityIds.forEach((id) => this.settled.add(id));
      if (failedAny) this.notify();
    }
  }

  /**
   * Resolve the rows for one batch. The WebSocket request is retried once
   * (covering a Home Assistant reconnect window) before the REST fallback.
   * `false` means both transports errored or timed out for this batch.
   */
  private async fetchBatch(
    entityIds: string[],
    startMs: number,
    endMs: number,
  ): Promise<boolean> {
    const start = new Date(startMs);
    const end = new Date(endMs);
    const hours = (endMs - startMs) / 3_600_000;
    const message: HistoryWsRequest = {
      type: "history/history_during_period",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      entity_ids: entityIds,
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    };

    const started = Date.now();
    const accept = (response: unknown): void => {
      const changed = this.ingest(response, entityIds);
      const covered = this.cover(entityIds, startMs, endMs);
      if (changed || covered) this.notify();
    };
    const viaWebSocket = async (attempt: number): Promise<boolean> => {
      try {
        const response = await withTimeout(
          this.hass.callWS(message),
          this.timeoutMs,
        );
        accept(response);
        debugHistory("ws batch", {
          entities: entityIds.length,
          hours,
          attempt,
          ms: Date.now() - started,
        });
        return true;
      } catch (error) {
        debugHistory("ws batch failed", {
          entities: entityIds.length,
          hours,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    };

    if (await viaWebSocket(1)) return true;
    await pause(this.retryDelayMs);
    if (await viaWebSocket(2)) return true;

    try {
      const path =
        `history/period/${encodeURIComponent(start.toISOString())}` +
        `?filter_entity_id=${entityIds.join(",")}` +
        `&end_time=${encodeURIComponent(end.toISOString())}` +
        `&minimal_response&no_attributes`;
      const response = await withTimeout(
        this.hass.callApi("GET", path),
        this.timeoutMs,
      );
      accept(response);
      debugHistory("rest batch", {
        entities: entityIds.length,
        hours,
        ms: Date.now() - started,
      });
      return true;
    } catch (error) {
      debugHistory("rest batch failed", {
        entities: entityIds.length,
        hours,
        error: error instanceof Error ? error.message : String(error),
      });
      /* Both transports failed: keep previously cached data. */
      return false;
    }
  }

  /** Merge a response; `true` means at least one entity received rows. */
  private ingest(response: unknown, entityIds: string[]): boolean {
    if (!response) return false;
    let changed = false;
    const write = (entityId: string | undefined, rows: unknown): void => {
      if (this.put(entityId, rows)) changed = true;
    };

    if (Array.isArray(response)) {
      if (response.every((item) => Array.isArray(item))) {
        response.forEach((rows, index) => write(entityIds[index], rows));
        return changed;
      }
      // A flat list of rows is only unambiguous for a single entity.
      if (entityIds.length === 1) write(entityIds[0], response);
      return changed;
    }

    if (typeof response === "object") {
      for (const [id, rows] of Object.entries(
        response as Record<string, unknown>,
      )) {
        write(id, rows);
      }
    }
    return changed;
  }

  /**
   * Merge rows into the cache without replacing a longer window with a
   * shorter live-tail refresh.
   */
  private put(entityId: string | undefined, rows: unknown): boolean {
    if (!entityId || !Array.isArray(rows) || !rows.length) return false;
    const previous = this.cache.get(entityId);
    this.failed.delete(entityId);
    this.cache.set(entityId, {
      rows: mergeRows(previous?.rows ?? [], rows as HistoryRow[]),
      fetchedAt: previous?.fetchedAt ?? this.now().getTime(),
      coverage: previous?.coverage ?? [],
    });
    return true;
  }

  /**
   * Mark a window as answered for every requested entity, even when the
   * recorder returned no rows. Without this a purged day would stay
   * `loading` forever.
   */
  private cover(entityIds: string[], start: number, end: number): boolean {
    const nowMs = this.now().getTime();
    let changed = false;
    for (const entityId of entityIds) {
      const previous = this.cache.get(entityId);
      const coverage = mergeCoverage(previous?.coverage ?? [], { start, end });
      if (!previous || !sameCoverage(previous.coverage, coverage)) {
        changed = true;
      }
      this.cache.set(entityId, {
        rows: previous?.rows ?? [],
        fetchedAt: nowMs,
        coverage,
      });
    }
    return changed;
  }
}
