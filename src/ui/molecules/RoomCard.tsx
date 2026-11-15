import type { CSSProperties } from "react";
import { formatNumber } from "../../format";
import type { ChartValues } from "../../render/charts";
import type { GraphInput } from "../../render/graph";
import { Dot } from "../atoms/Dot";
import { Icon } from "../atoms/Icon";
import { Sparkline } from "../atoms/Sparkline";
import type { RoomView } from "../view-types";
import { c } from "../styles/classes";

export interface RoomCardProps {
  room: RoomView;
  onOpen: () => void;
  language?: string;
  openLabel?: string;
  spark?: ChartValues;
  sparkGraph?: GraphInput | null;
}

/** The air/lights/openings status line under the room temperature. */
function RoomStatus({ room }: { room: RoomView }) {
  const airTone =
    room.air === "warn" ? "warn" : room.air === "off" ? "off" : "ok";
  return (
    <div className={c("room-status")}>
      <span>
        <Dot tone={airTone} />
        <span>{room.airLabel}</span>
      </span>
      {room.lightsTotal > 0 ? (
        <span>
          <Dot tone={room.lightsOn > 0 ? "ok" : "off"} />
          <span>
            {room.lightsLabel ?? `${room.lightsOn}/${room.lightsTotal} lights`}
          </span>
        </span>
      ) : null}
      {room.openLabel ? (
        <span>
          <Dot tone={room.open > 0 ? "warn" : "off"} />
          <span>{room.openLabel}</span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * One room tile on the home view. Mirrors the legacy `roomCard()` markup:
 * the room tint is exposed as `--room` for the icon, dots, and sparkline.
 */
export function RoomCard({
  room,
  onOpen,
  language = "da",
  openLabel = "Open room",
  spark,
  sparkGraph = null,
}: RoomCardProps) {
  const temp = room.temp === null ? "–" : formatNumber(room.temp, 1, language);
  const style = { "--room": room.tint } as CSSProperties;

  return (
    <article
      className={c("room-card", room.wide && "wide")}
      style={style}
      data-room={room.id}
    >
      <div className={c("room-top")}>
        <div>
          <h3 className={c("room-name")}>
            <button
              type="button"
              className={c("card-link")}
              data-nav={`rum/${room.id}`}
              aria-label={`${room.name}, ${openLabel}`}
              onClick={onOpen}
            >
              {room.name}
            </button>
          </h3>
          <div className={c("room-kind")}>{room.kind}</div>
        </div>
        <span className={c("room-icon")}>
          <Icon name={room.icon} />
        </span>
      </div>
      <div className={c("room-main")}>
        <div className={c("room-temp", room.temp === null && "off")}>
          {temp}
          <sup>°</sup>
        </div>
        <RoomStatus room={room} />
      </div>
      <Sparkline
        className={c("room-spark")}
        values={spark ?? room.spark}
        height={40}
        pad={1}
        graph={sparkGraph}
        style={{ color: room.tint }}
      />
      <span className={c("room-open")}>{openLabel}</span>
    </article>
  );
}
