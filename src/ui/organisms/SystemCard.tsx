import type { CSSProperties } from "react";
import { formatNumber } from "../../format";
import { Icon } from "../atoms/Icon";
import type { SystemCardView } from "../home-view";

export interface SystemCardProps {
  card: SystemCardView;
  onOpen?: () => void;
}

/**
 * Ventilation/outdoor tile. Mirrors legacy `systemCard()` markup, including
 * the `data-sys-dot` and `data-spark` hooks the card's live patchers use.
 */
export function SystemCard({ card, onOpen }: SystemCardProps) {
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
      <svg
        className="room-spark"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          data-spark={card.tempEntity}
          d=""
          fill="none"
          stroke="var(--room)"
          strokeWidth={1.1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="room-open">{card.openLabel}</span>
    </button>
  );
}
