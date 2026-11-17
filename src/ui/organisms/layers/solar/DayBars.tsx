import { useEffect, useRef } from "react";
import { applyGraph } from "../../../../render/graph";
import { escapeHtml, formatNumber } from "../../../../format";
import type { Language } from "../../../../types";
import type { DayBarDatum } from "./helpers";
import { c } from "../../../styles/classes";

export interface DayBarsProps {
  days: DayBarDatum[];
  empty: string;
  language: Language;
  /** Start of the seven-day window the bars belong to, epoch milliseconds. */
  start: number;
  /** Exclusive end of the window, matching the selected range. */
  end: number;
}

/**
 * The seven-day production bars.
 *
 * The bars are written imperatively so the `applyGraph` dataset can be rebuilt
 * from the same day buckets on every history refresh. Rebuilding is skipped
 * while the rendered signature (`days`, `empty`, `language`, window) is
 * unchanged.
 */
export const DayBars = ({
  days,
  empty,
  language,
  start,
  end,
}: DayBarsProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const paintedRef = useRef<{ element: HTMLElement; sig: string } | null>(null);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    const sig = JSON.stringify([days, empty, language, start, end]);
    const painted = paintedRef.current;
    if (painted?.element === element && painted.sig === sig) return;
    paintedRef.current = { element, sig };

    if (!days.length) {
      element.innerHTML = `<span class="day-empty">${escapeHtml(empty)}</span>`;
      applyGraph(element, null);
      return;
    }

    const max = Math.max(...days.map((day) => day.value), 1);
    element.innerHTML = days
      .map(
        (day) =>
          `<div class="day${day.today ? " today" : ""}"><div class="val">${formatNumber(
            day.value,
            1,
            language,
          )}</div><div class="bar" style="height:${Math.max(
            4,
            (day.value / max) * 100,
          ).toFixed(1)}%"></div><div class="day-label">${escapeHtml(
            day.label,
          )}</div></div>`,
      )
      .join("");

    applyGraph(element, {
      mode: "bars",
      start,
      end,
      unit: "kWh",
      decimals: 1,
      series: [{ values: days.map((day) => day.value) }],
    });
  });

  return (
    <div
      ref={hostRef}
      className={c("day-bars")}
      data-bars="solarWeek"
      data-days={days.length}
    />
  );
};
