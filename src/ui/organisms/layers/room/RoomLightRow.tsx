import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

export interface RoomLightRowProps {
  entityId: string;
  name: string;
  isOn: boolean;
  brightness: number;
  showSlider?: boolean;
  /**
   * Label the slider from the thumb value instead of `isOn`. The lights sheet
   * needs this because a group can report off while its members are on.
   */
  offWhenZero?: boolean;
  t: Translator;
  onToggle: () => void;
  onBrightness: (percent: number) => void;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * The shared light row for the room and lights sheets. The slider is
 * deliberately uncontrolled: a hass push can re-render the whole sheet
 * mid-drag, and writing `value` back would fight the thumb. Sync the DOM
 * value only while it is not focused.
 */
export function RoomLightRow({
  entityId,
  name,
  isOn,
  brightness,
  showSlider = true,
  offWhenZero = false,
  t,
  onToggle,
  onBrightness,
}: RoomLightRowProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const pct = clampPercent(brightness);
  const [displayPct, setDisplayPct] = useState(pct);

  useEffect(() => {
    const input = sliderRef.current;
    if (!input) {
      setDisplayPct(pct);
      return;
    }
    const scope = input.getRootNode() as Document | ShadowRoot;
    if (scope.activeElement === input) return;
    setDisplayPct(pct);
    input.value = String(pct);
    input.style.setProperty("--p", `${pct}%`);
  }, [pct]);

  const sliderStyle = { "--p": `${displayPct}%` } as CSSProperties;
  const sub = isOn
    ? t("room.lightOn", { pct: displayPct })
    : t("room.lightOff");
  const showPct = offWhenZero ? displayPct > 0 : isOn;

  return (
    <div className={c("light-row")}>
      <div className={c("row")}>
        <button
          type="button"
          className={c("toggle", isOn && "on")}
          data-act="toggle-light"
          data-entity={entityId}
          data-on={entityId}
          aria-label={t("lights.toggleAria", { name })}
          aria-pressed={isOn}
          onClick={onToggle}
        />
        <div className={c("row-main")}>
          <div className={c("row-name")}>{name}</div>
          <div className={c("row-sub")}>{sub}</div>
        </div>
        <span className={c("row-val")}>{isOn ? `${displayPct} %` : "–"}</span>
      </div>
      {showSlider ? (
        <div className={c("slider-wrap")}>
          <div className={c("slider-line")}>
            <Icon name="sun" />
            <input
              ref={sliderRef}
              className={c("range")}
              type="range"
              min="0"
              max="100"
              step="1"
              data-light-range={entityId}
              data-range-entity={entityId}
              defaultValue={pct}
              aria-label={name}
              style={sliderStyle}
              onInput={(event) => {
                const next = clampPercent(Number(event.currentTarget.value));
                setDisplayPct(next);
                event.currentTarget.style.setProperty("--p", `${next}%`);
                onBrightness(next);
              }}
            />
          </div>
          <div className={c("pct")}>
            {showPct ? `${displayPct} %` : t("lights.sliderOff")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
