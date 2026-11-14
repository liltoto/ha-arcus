import type { CSSProperties } from "react";
import { formatNumber } from "../../format";
import type { ChartValues } from "../../render/charts";
import type { GraphInput } from "../../render/graph";
import { Sparkline } from "../atoms/Sparkline";
import { Icon } from "../atoms/Icon";
import type { SystemCardView } from "../home-view";
import { c } from "../styles/classes";

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
export function SystemCard({
  card,
  onOpen,
  spark,
  sparkGraph = null,
}: SystemCardProps) {
  const temp =
    card.temp === null ? "–" : formatNumber(card.temp, 1, card.language);
  const style = { "--room": card.tint } as CSSProperties;

  return (
    <button
      type="button"
      className={c("room-card")}
      style={style}
      data-nav={card.route}
      data-system={card.id}
      onClick={onOpen}
    >
      <div className={c("room-top")}>
        <div>
          <div className={c("room-name")}>{card.name}</div>
          <div className={c("room-kind")}>{card.kind}</div>
        </div>
        <span className={c("room-icon")}>
          <Icon name={card.icon} />
        </span>
      </div>
      <div className={c("room-main")}>
        <div className={c("room-temp")}>
          {temp}
          <sup>°</sup>
        </div>
        <div className={c("room-status")}>
          <span>
            <i className={c("sdot")} data-sys-dot={card.id} />
            <span>{card.sub}</span>
          </span>
        </div>
      </div>
      <Sparkline
        className={c("room-spark")}
        values={spark ?? []}
        height={40}
        pad={1}
        graph={sparkGraph}
        style={{ color: card.tint }}
      />
      <span className={c("room-open")}>{card.openLabel}</span>
    </button>
  );
}
