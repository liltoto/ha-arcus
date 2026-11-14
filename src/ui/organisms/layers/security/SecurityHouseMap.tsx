import type { CSSProperties } from "react";
import type { HomeModel, Translator } from "../../../../types";
import { c } from "../../../styles/classes";
import { HOUSE_CELLS, type SecurityHouseDot } from "./security-view";

export interface SecurityHouseMapProps {
  rooms: HomeModel["rooms"];
  dots: SecurityHouseDot[];
  leak: boolean;
  openCount: number;
  lowBattery: number;
  t: Translator;
}

function roomLabel(name: string): string {
  const short = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  return short.toLocaleUpperCase();
}

/**
 * The house schematic, its legend and the leak/open/battery chips. Every room
 * cell is fixed: doors and openings are placed into the cell of their room,
 * with the opening index as the fallback when the room is unknown.
 */
export function SecurityHouseMap({
  rooms,
  dots,
  leak,
  openCount,
  lowBattery,
  t,
}: SecurityHouseMapProps) {
  const houseRooms = rooms.slice(0, HOUSE_CELLS.length);

  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("security.houseNow")}</div>
      <div className={c("house-wrap")}>
        <svg
          viewBox="0 0 560 220"
          className={c("house-svg")}
          aria-hidden="true"
        >
          {HOUSE_CELLS.map((cell, index) => {
            const room = houseRooms[index];
            return (
              <g key={index}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  rx="8"
                  className={c("house-room")}
                />
                {room ? (
                  <text
                    x={cell.cx}
                    y={cell.labelY}
                    textAnchor="middle"
                    className={c("house-name")}
                  >
                    {roomLabel(room.name)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {dots.map((dot) => (
            <circle
              key={dot.id}
              cx={dot.cx}
              cy={dot.cy}
              r="4"
              className={c("house-dot", dot.open && "open")}
              data-open={dot.id}
            />
          ))}
        </svg>
        <div className={c("legend")}>
          <span>
            <i style={{ "--c": "var(--sage)" } as CSSProperties} />
            {t("security.closed")}
          </span>
          <span>
            <i style={{ "--c": "var(--coral)" } as CSSProperties} />
            {t("security.open")}
          </span>
        </div>
        <div className={c("chip-row")} data-security-chips>
          <span
            className={c("chip", leak ? "crit" : "on")}
            data-chip="leak"
            data-sev={leak ? "crit" : "ok"}
          >
            {leak ? t("security.leakDetected") : t("security.noLeak")}
          </span>
          <span
            className={c("chip", openCount ? "warn" : "on")}
            data-chip="open"
            data-sev={openCount ? "warn" : "ok"}
          >
            {openCount
              ? t("security.summaryOpen", { count: openCount })
              : t("security.summaryClosed")}
          </span>
          {lowBattery ? (
            <span
              className={c("chip warn")}
              data-chip="battery"
              data-sev="warn"
            >
              {t("security.batteries")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
