import { useEffect, useRef } from "react";
import { applyGraph } from "../../../../render/graph";
import { escapeHtml, formatNumber } from "../../../../format";
import type { Language } from "../../../../types";
import { DAY_MS, type DayBarDatum } from "./helpers";
import { c } from "../../../styles/classes";

export interface DayBarsProps {
  days: DayBarDatum[];
  empty: string;
  language: Language;
}

/**
 * The seven-day production bars.
 *
 * The bars are written imperatively so the `applyGraph` dataset can be rebuilt
 * from the same day buckets on every history refresh.
 */
export function DayBars({ days, empty, language }: DayBarsProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;

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

    const start = new Date(`${days[0].key}T00:00:00`).getTime();
    const last = days[days.length - 1].key;
    const end = new Date(`${last}T00:00:00`).getTime() + DAY_MS;
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
}
