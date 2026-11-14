/**
 * Minimal structural view of the Home Assistant object.
 *
 * Kept local to this module so the history cache does not depend on the
 * (still unfinished) shared types module.
 */
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
  hours: number;
}

const CACHE_MS = 5 * 60 * 1000;

/**
 * Keep each WebSocket/REST history request small. A home-sized dashboard asks
 * for dozens of entities, and a single request can exceed HA recorder
 * guardrails or the WebSocket response budget when busy sensors (load, grid)
 * return thousands of rows each.
 */
const FETCH_BATCH = 4;

/** Opt-in console diagnostics: set `localStorage.arcus-debug = "1"`. */
function debugHistory(message: string, details: unknown): void {
  try {
    if (globalThis.localStorage?.getItem("arcus-debug") === "1") {
      console.debug(`[arcus history] ${message}`, details);
    }
  } catch {
    /* localStorage can be unavailable in embedded browsers. */
  }
}
const DAY_MS = 24 * 60 * 60 * 1000;

/** Numeric epoch seconds or an ISO/numeric date string -> milliseconds. */
function rowTimestamp(row: HistoryRow): number {
  const raw = row.lu ?? row.last_updated ?? row.last_changed ?? row.lc;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw * 1000 : 0;
  if (typeof raw === "string") {
    if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) * 1000;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** State value -> number, preserving gaps as `null`. */
export function rowValue(row: HistoryRow): number | null {
  const raw = row.s ?? row.state;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value || value === "unavailable" || value === "unknown") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

/**
 * Per-entity history cache used by the cards and sheets.
 *
 * A fetch is considered fresh for five minutes, in-flight requests are shared
 * per entity, and a request for a shorter range never replaces a longer one
 * that is already cached. WebSocket failures fall back to the REST history
 * endpoint.
 */
export class HistoryCache {
  private readonly hass: HistoryHass;
  private readonly now: () => Date;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  constructor(hass: HistoryHass, now: () => Date = () => new Date()) {
    this.hass = hass;
    this.now = now;
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

  /** Load up to `hours` of history for the given entities. */
  async ensure(entityIds: string[], hours: number): Promise<void> {
    const ids = [
      ...new Set(
        entityIds.filter((id) => typeof id === "string" && id.length > 0),
      ),
    ];
    if (!ids.length) return;

    const pending = ids
      .map((id) => this.inflight.get(id))
      .filter((request): request is Promise<void> => Boolean(request));
    if (pending.length) await Promise.allSettled(pending);

    const need = ids.filter((id) =>
      this.needs(id, hours, this.now().getTime()),
    );
    if (!need.length) return;

    const request = this.fetch(need, hours);
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
  series(
    entityId: string,
    options: SeriesOptions = {},
  ): Array<number | null> {
    const entry = this.cache.get(entityId);
    if (!entry) return [];
    const now = this.now().getTime();
    const end = options.end ?? now;
    const start =
      options.start ?? end - (options.hours ?? 24) * 60 * 60 * 1000;
    return this.bucket(
      entry.rows,
      start,
      end,
      options.buckets ?? 90,
      options.fill ?? null,
    );
  }

  /** Cached series for the last `days`, mapped into time buckets. */
  window(
    entityId: string,
    days: number,
    options: SeriesOptions = {},
  ): Array<number | null> {
    const entry = this.cache.get(entityId);
    if (!entry) return [];
    const end = this.now().getTime();
    return this.bucket(
      entry.rows,
      end - days * DAY_MS,
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
    const count = Math.max(1, Math.round(buckets));
    const width = (end - start) / count;
    const sums = new Array<number>(count).fill(0);
    const counts = new Array<number>(count).fill(0);
    const nulls = new Array<boolean>(count).fill(false);
    let hasValue = false;

    for (const row of rows) {
      const timestamp = rowTimestamp(row);
      if (!timestamp || timestamp < start || timestamp > end) continue;
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

  private needs(entityId: string, hours: number, nowMs: number): boolean {
    const entry = this.cache.get(entityId);
    if (!entry) return true;
    if (nowMs - entry.fetchedAt > CACHE_MS) return true;
    return hours > entry.hours + 1;
  }

  private async fetch(entityIds: string[], hours: number): Promise<void> {
    for (let index = 0; index < entityIds.length; index += FETCH_BATCH) {
      await this.fetchBatch(
        entityIds.slice(index, index + FETCH_BATCH),
        hours,
      );
    }
  }

  private async fetchBatch(
    entityIds: string[],
    hours: number,
  ): Promise<void> {
    const end = this.now();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
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
    try {
      const response = await this.hass.callWS(message);
      this.ingest(response, entityIds, hours);
      debugHistory("ws batch", {
        entities: entityIds.length,
        hours,
        ms: Date.now() - started,
      });
      return;
    } catch (error) {
      debugHistory("ws batch failed", {
        entities: entityIds.length,
        hours,
        error: error instanceof Error ? error.message : String(error),
      });
      /* WebSocket unavailable: fall through to the REST endpoint. */
    }

    try {
      const path =
        `history/period/${encodeURIComponent(start.toISOString())}` +
        `?filter_entity_id=${entityIds.join(",")}&minimal_response&no_attributes`;
      const response = await this.hass.callApi("GET", path);
      this.ingest(response, entityIds, hours);
      debugHistory("rest batch", {
        entities: entityIds.length,
        hours,
        ms: Date.now() - started,
      });
    } catch (error) {
      debugHistory("rest batch failed", {
        entities: entityIds.length,
        hours,
        error: error instanceof Error ? error.message : String(error),
      });
      /* Both transports failed: keep previously cached data. */
    }
  }

  private ingest(response: unknown, entityIds: string[], hours: number): void {
    if (!response) return;

    if (Array.isArray(response)) {
      if (response.every((item) => Array.isArray(item))) {
        response.forEach((rows, index) =>
          this.put(entityIds[index], rows, hours),
        );
        return;
      }
      // A flat list of rows is only unambiguous for a single entity.
      if (entityIds.length === 1) this.put(entityIds[0], response, hours);
      return;
    }

    if (typeof response === "object") {
      for (const [id, rows] of Object.entries(
        response as Record<string, unknown>,
      )) {
        this.put(id, rows, hours);
      }
    }
  }

  private put(
    entityId: string | undefined,
    rows: unknown,
    hours: number,
  ): void {
    if (!entityId || !Array.isArray(rows)) return;
    const previous = this.cache.get(entityId);
    if (previous && hours < previous.hours) return;
    this.cache.set(entityId, {
      rows: rows as HistoryRow[],
      fetchedAt: this.now().getTime(),
      hours,
    });
    this.notify();
  }
}
