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
const MAX_POINTS = 90;
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
function rowValue(row: HistoryRow): number | null {
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
 * Average buckets to at most `target` points. `null` entries are skipped
 * inside a bucket but survive when a bucket contains no numeric value, so
 * gaps in the series stay visible.
 */
function downsample(
  values: Array<number | null>,
  target = MAX_POINTS,
): Array<number | null> {
  if (values.length <= target) return values;
  const out: Array<number | null> = [];
  const step = values.length / target;
  for (let i = 0; i < target; i++) {
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    let sum = 0;
    let count = 0;
    for (let j = from; j < to && j < values.length; j++) {
      const value = values[j];
      if (value !== null) {
        sum += value;
        count++;
      }
    }
    out.push(count ? sum / count : null);
  }
  return out;
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

  /** Full cached series, downsampled to at most 90 points. */
  series(entityId: string): Array<number | null> {
    const entry = this.cache.get(entityId);
    if (!entry) return [];
    return downsample(entry.rows.map(rowValue));
  }

  /** Cached series filtered to the last `days` days, downsampled to at most 90 points. */
  window(entityId: string, days: number): Array<number | null> {
    const entry = this.cache.get(entityId);
    if (!entry) return [];
    const cutoff = this.now().getTime() - days * DAY_MS;
    const rows = entry.rows.filter((row) => rowTimestamp(row) >= cutoff);
    return downsample(rows.map(rowValue));
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

    try {
      const response = await this.hass.callWS(message);
      this.ingest(response, entityIds, hours);
      return;
    } catch {
      /* WebSocket unavailable: fall through to the REST endpoint. */
    }

    try {
      const path =
        `history/period/${encodeURIComponent(start.toISOString())}` +
        `?filter_entity_id=${entityIds.join(",")}&minimal_response&no_attributes`;
      const response = await this.hass.callApi("GET", path);
      this.ingest(response, entityIds, hours);
    } catch {
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
