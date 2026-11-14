import type { CSSProperties } from "react";
import { formatNumber } from "../../format";
import type { ChartValues } from "../../render/charts";
import type { GraphInput } from "../../render/graph";
import { Dot } from "../atoms/Dot";
import { Icon } from "../atoms/Icon";
import { Sparkline } from "../atoms/Sparkline";
import type { RoomView } from "../view-types";

export interface RoomCardProps {
  room: RoomView;
  onOpen: () => void;
  language?: string;
  openLabel?: string;
  spark?: ChartValues;
  sparkGraph?: GraphInput | null;
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
  const airTone =
    room.air === "warn" ? "warn" : room.air === "off" ? "off" : "ok";
  const style = { "--room": room.tint } as CSSProperties;

  return (
    <button
      type="button"
      className={`room-card${room.wide ? " wide" : ""}`}
      style={style}
      data-nav={`rum/${room.id}`}
      data-room={room.id}
      onClick={onOpen}
    >
      <div className="room-top">
        <div>
          <div className="room-name">{room.name}</div>
          <div className="room-kind">{room.kind}</div>
        </div>
        <span className="room-icon">
          <Icon name={room.icon} />
        </span>
      </div>
      <div className="room-main">
        <div className={`room-temp${room.temp === null ? " off" : ""}`}>
          {temp}
          <sup>°</sup>
        </div>
        <div className="room-status">
          <span>
            <Dot tone={airTone} />
            <span>{room.airLabel}</span>
          </span>
          {room.lightsTotal > 0 ? (
            <span>
              <Dot tone={room.lightsOn > 0 ? "ok" : "off"} />
              <span>
                {room.lightsLabel ??
                  `${room.lightsOn}/${room.lightsTotal} lights`}
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
      </div>
      <Sparkline
        className="room-spark"
        values={spark ?? room.spark}
        height={40}
        pad={1}
        graph={sparkGraph}
        style={{ color: room.tint }}
      />
      <span className="room-open">{openLabel}</span>
    </button>
  );
}
