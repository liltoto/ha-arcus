import type { CSSProperties } from "react";
import { Icon } from "../atoms/Icon";

export interface LightRowProps {
  name: string;
  isOn: boolean;
  brightness: number;
  onToggle: () => void;
  onBrightness: (percent: number) => void;
  icon?: string;
  entity?: string;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * One dimmable light: the legacy toggle row plus the brightness slider and
 * its inline percentage readout. Brightness is always 0-100 here; the page
 * converts to HA's 0-255 scale.
 */
export function LightRow({
  name,
  isOn,
  brightness,
  onToggle,
  onBrightness,
  icon,
  entity,
}: LightRowProps) {
  const pct = clampPercent(brightness);
  const sub = isOn ? `On · ${pct} %` : "Off";
  const sliderStyle = { "--p": `${pct}%` } as CSSProperties;

  return (
    <div className="light-row">
      <div className="row">
        <button
          type="button"
          className={`toggle${isOn ? " on" : ""}`}
          aria-pressed={isOn}
          aria-label={`Toggle ${name}`}
          data-act="toggle-light"
          data-entity={entity}
          onClick={onToggle}
        />
        {icon ? <Icon name={icon} /> : null}
        <div className="row-main">
          <div className="row-name">{name}</div>
          <div className="row-sub">{sub}</div>
        </div>
        <span className="row-val">{isOn ? `${pct} %` : "–"}</span>
      </div>
      <div className="slider-wrap">
        <div className="slider-line">
          <Icon name="sun" />
          <input
            className="range"
            type="range"
            min="0"
            max="100"
            step="1"
            value={pct}
            style={sliderStyle}
            aria-label={`Brightness ${name}`}
            onChange={(event) =>
              onBrightness(Number(event.currentTarget.value))
            }
          />
        </div>
        <div className="pct">{isOn ? `${pct} %` : "Off"}</div>
      </div>
    </div>
  );
}
