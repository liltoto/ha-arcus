import type { CSSProperties } from "react";
import { clampPercent } from "../../format";
import { Icon } from "../atoms/Icon";
import { c } from "../styles/classes";
import { LightRowMain } from "./LightRowMain";

export interface LightRowProps {
  name: string;
  isOn: boolean;
  brightness: number;
  onToggle: () => void;
  onBrightness: (percent: number) => void;
  icon?: string;
  entity?: string;
  toggleLabel?: string;
  brightnessLabel?: string;
}

/**
 * One dimmable light: the legacy toggle row plus the brightness slider and
 * its inline percentage readout. Brightness is always 0-100 here; the page
 * converts to HA's 0-255 scale.
 */
export const LightRow = ({
  name,
  isOn,
  brightness,
  onToggle,
  onBrightness,
  icon,
  entity,
  toggleLabel = `Toggle ${name}`,
  brightnessLabel = `Brightness ${name}`,
}: LightRowProps) => {
  const pct = clampPercent(brightness);
  const sub = isOn ? `On · ${pct} %` : "Off";
  const sliderStyle = { "--p": `${pct}%` } as CSSProperties;

  return (
    <div className={c("light-row")}>
      <button
        type="button"
        className={c("row", "row-button", isOn && "on")}
        aria-pressed={isOn}
        aria-label={toggleLabel}
        data-act="toggle-light"
        data-entity={entity}
        onClick={onToggle}
      >
        <span className={c("toggle", isOn && "on")} aria-hidden="true" />
        {icon ? <Icon name={icon} /> : null}
        <LightRowMain name={name} sub={sub} value={isOn ? `${pct} %` : "–"} />
      </button>
      <div className={c("slider-wrap")}>
        <div className={c("slider-line")}>
          <Icon name="sun" />
          <input
            className={c("range")}
            type="range"
            min="0"
            max="100"
            step="1"
            value={pct}
            style={sliderStyle}
            aria-label={brightnessLabel}
            onChange={(event) =>
              onBrightness(Number(event.currentTarget.value))
            }
          />
        </div>
        <div className={c("pct")}>{isOn ? `${pct} %` : "Off"}</div>
      </div>
    </div>
  );
};
