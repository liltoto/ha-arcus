/* ---------- SVG-grafer ---------- */

export type ChartPoint = { x: number; y: number };
export type ChartRange = { min: number; max: number };
export type ChartValues = ReadonlyArray<number | null | undefined>;
export type HistoryRowLike = { s?: unknown; state?: unknown };

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/**
 * A symmetric 1000×300 parabola. The defaults put the endpoints at
 * (40, 210) and (960, 210), with the apex at (500, 60).
 */
export function arcPoint(t: number, w = 920, x0 = 40, base = 210, rise = 150): ChartPoint {
  const x = x0 + w * clamp(t, 0, 1);
  const y = base - rise * 4 * clamp(t, 0, 1) * (1 - clamp(t, 0, 1));
  return { x, y };
}

export function priceColor(price: number | null | undefined, min: number, max: number): string {
  if (price === null || price === undefined) return "#6b7280";
  const r = max > min ? (price - min) / (max - min) : 0;
  if (r < 0.34) return "#8FB08B";
  if (r < 0.67) return "#D8A657";
  return "#E0785E";
}

export function sparkPath(values: ChartValues, w = 100, h = 28, pad = 2, range: ChartRange | null = null): string {
  const nums = (values || []).map((v) =>
    v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v),
  );
  const valid = nums.filter((v): v is number => v !== null);
  if (!valid.length) return "";
  let min = range?.min ?? Math.min(...valid);
  let max = range?.max ?? Math.max(...valid);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const span = max - min;
  const step = nums.length > 1 ? (w - pad * 2) / (nums.length - 1) : 0;
  let d = "";
  let pen = false;
  nums.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    const x = pad + i * step;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    d += `${pen ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    pen = true;
  });
  return d;
}

export function areaPath(values: ChartValues, w = 100, h = 28, pad = 2, range: ChartRange | null = null): string {
  const line = sparkPath(values, w, h, pad, range);
  if (!line) return "";
  return `${line}L${w - pad},${h - pad}L${pad},${h - pad}Z`;
}

/**
 * Average the series into `target` buckets, preserving gaps as nulls.
 * A series already short enough is returned unchanged.
 */
export function downsample(values: ChartValues, target = 48): Array<number | null> {
  if (!values || !values.length) return [];
  if (values.length <= target) {
    return values.map((v) =>
      v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v),
    );
  }
  const out: Array<number | null> = [];
  const step = values.length / target;
  for (let i = 0; i < target; i++) {
    const a = Math.floor(i * step);
    const b = Math.max(a + 1, Math.floor((i + 1) * step));
    let sum = 0;
    let n = 0;
    for (let j = a; j < b && j < values.length; j++) {
      const v = values[j];
      if (v !== null && v !== undefined && !Number.isNaN(Number(v))) {
        sum += Number(v);
        n++;
      }
    }
    out.push(n ? sum / n : null);
  }
  return out;
}

/** Map Home Assistant history rows (`s` or `state`) to a numeric series. */
export function seriesFromHistory(rows: unknown): Array<number | null> {
  if (!Array.isArray(rows)) return [];
  return rows.map((row: HistoryRowLike) => {
    const v = row?.s ?? row?.state;
    if (v === "unavailable" || v === "unknown" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  });
}
