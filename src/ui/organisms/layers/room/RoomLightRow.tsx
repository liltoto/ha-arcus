import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { clampPercent } from "../../../../format";
import type { Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { LightRowMain } from "../../../molecules/LightRowMain";
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

interface RoomLightSliderProps {
  sliderRef: RefObject<HTMLInputElement | null>;
  entityId: string;
  name: string;
  pct: number;
  displayPct: number;
  sliderStyle: CSSProperties;
  showPct: boolean;
  t: Translator;
  onInputPct: (percent: number) => void;
}

/** The uncontrolled brightness slider under a light row. */
function RoomLightSlider({
  sliderRef,
  entityId,
  name,
  pct,
  displayPct,
  sliderStyle,
  showPct,
  t,
  onInputPct,
}: RoomLightSliderProps) {
  return (
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
            event.currentTarget.style.setProperty("--p", `${next}%`);
            onInputPct(next);
          }}
        />
      </div>
      <div className={c("pct")}>
        {showPct ? `${displayPct} %` : t("lights.sliderOff")}
      </div>
    </div>
  );
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
      <button
        type="button"
        className={c("row", "row-button", isOn && "on")}
        data-act="toggle-light"
        data-entity={entityId}
        data-on={entityId}
        aria-label={t("lights.toggleAria", { name })}
        aria-pressed={isOn}
        onClick={onToggle}
      >
        <span className={c("toggle", isOn && "on")} aria-hidden="true" />
        <LightRowMain
          name={name}
          sub={sub}
          value={isOn ? `${displayPct} %` : "–"}
        />
      </button>
      {showSlider ? (
        <RoomLightSlider
          sliderRef={sliderRef}
          entityId={entityId}
          name={name}
          pct={pct}
          displayPct={displayPct}
          sliderStyle={sliderStyle}
          showPct={showPct}
          t={t}
          onInputPct={(next) => {
            setDisplayPct(next);
            onBrightness(next);
          }}
        />
      ) : null}
    </div>
  );
}
