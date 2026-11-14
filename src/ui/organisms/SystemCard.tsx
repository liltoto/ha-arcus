import type { CSSProperties } from "react";
import { formatNumber } from "../../format";
import type { ChartValues } from "../../render/charts";
import type { GraphInput } from "../../render/graph";
import { Sparkline } from "../atoms/Sparkline";
import { Icon } from "../atoms/Icon";
import type { SystemCardView } from "../home-view";

export interface SystemCardProps {
  card: SystemCardView;
  onOpen?: () => void;
  spark?: ChartValues;
  sparkGraph?: GraphInput | null;
}

/**
 * Ventilation/outdoor tile. Mirrors legacy `systemCard()` markup, including
 * the `data-sys-dot` hook and a React-owned history sparkline.
 */
export function SystemCard({ card, onOpen, spark, sparkGraph = null }: SystemCardProps) {
  const temp =
    card.temp === null ? "–" : formatNumber(card.temp, 1, card.language);
  const style = { "--room": card.tint } as CSSProperties;

  return (
    <button
      type="button"
      className="room-card"
      style={style}
      data-nav={card.route}
      data-system={card.id}
      onClick={onOpen}
    >
      <div className="room-top">
        <div>
          <div className="room-name">{card.name}</div>
          <div className="room-kind">{card.kind}</div>
        </div>
        <span className="room-icon">
          <Icon name={card.icon} />
        </span>
      </div>
      <div className="room-main">
        <div className="room-temp">
          {temp}
          <sup>°</sup>
        </div>
        <div className="room-status">
          <span>
            <i className="sdot" data-sys-dot={card.id} />
            <span>{card.sub}</span>
          </span>
        </div>
      </div>
      <Sparkline
        className="room-spark"
        values={spark ?? []}
        height={40}
        graph={sparkGraph}
        style={{ color: card.tint }}
      />
      <span className="room-open">{card.openLabel}</span>
    </button>
  );
}
