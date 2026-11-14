import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ArcusHass, LightGroupModel, Translator } from "../../../types";
import { useActions, useHass, useModel, useTranslator } from "../../hooks";
import { Icon } from "../../atoms/Icon";
import { SheetHeader } from "../../molecules/SheetHeader";
import { c } from "../../styles/classes";

interface LightState {
  isOn: boolean;
  pct: number;
}

function lightState(hass: ArcusHass, entityId: string): LightState {
  const entity = hass.states?.[entityId];
  const isOn = entity?.state === "on";
  const brightness = entity?.attributes?.brightness;
  const pct =
    isOn && typeof brightness === "number" && Number.isFinite(brightness)
      ? Math.round((brightness / 255) * 100)
      : 0;
  return { isOn, pct };
}

function entityName(
  hass: ArcusHass,
  entityId: string,
  fallback: string,
): string {
  return String(hass.states?.[entityId]?.attributes?.friendly_name ?? fallback);
}

function allLightIds(groups: LightGroupModel[]): string[] {
  const ids = new Set<string>();
  for (const group of groups) {
    if (group.members.length) {
      group.members.forEach((id) => ids.add(id));
    } else {
      ids.add(group.entityId);
    }
    group.extra.forEach((id) => ids.add(id));
  }
  return [...ids];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

interface LightControlProps {
  entityId: string;
  name: string;
  state: LightState;
  showSlider: boolean;
  t: Translator;
  onToggle: () => void;
  onBrightness: (percent: number) => void;
}

/**
 * One light row. The slider is deliberately uncontrolled: a Home Assistant
 * state push re-renders the sheet while the user is dragging, and writing the
 * `value` prop back would fight the thumb. The DOM value is synced from hass
 * only while the slider is not focused.
 */
function LightControl({
  entityId,
  name,
  state,
  showSlider,
  t,
  onToggle,
  onBrightness,
}: LightControlProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const [displayPct, setDisplayPct] = useState(state.pct);

  useEffect(() => {
    const input = sliderRef.current;
    if (!input) {
      setDisplayPct(state.pct);
      return;
    }
    const scope = input.getRootNode() as Document | ShadowRoot;
    if (scope.activeElement === input) return;
    setDisplayPct(state.pct);
    input.value = String(state.pct);
    input.style.setProperty("--p", `${state.pct}%`);
  }, [state.pct]);

  const sub = state.isOn
    ? t("room.lightOn", { pct: displayPct })
    : t("room.lightOff");
  const sliderStyle = { "--p": `${displayPct}%` } as CSSProperties;

  return (
    <div className={c("light-row")}>
      <div className={c("row")}>
        <button
          type="button"
          className={c("toggle", state.isOn && "on")}
          data-act="toggle-light"
          data-entity={entityId}
          data-on={entityId}
          aria-label={t("lights.toggleAria", { name })}
          aria-pressed={state.isOn}
          onClick={onToggle}
        />
        <div className={c("row-main")}>
          <div className={c("row-name")}>{name}</div>
          <div className={c("row-sub")}>{sub}</div>
        </div>
        <span className={c("row-val")}>
          {state.isOn ? `${displayPct} %` : "–"}
        </span>
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
              defaultValue={state.pct}
              data-light-range={entityId}
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
            {displayPct > 0 ? `${displayPct} %` : t("lights.sliderOff")}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The house-wide light sheet, ported from `views/layers/lights.ts`.
 * Group rows toggle the Home Assistant light group; the disclosure list
 * exposes the individual spots without a slider, just like the legacy sheet.
 */
export function LightsBody() {
  const hass = useHass();
  const model = useModel();
  const t = useTranslator();
  const actions = useActions();

  const groups = model.lights ?? [];
  const ids = allLightIds(groups);
  const stored = model.lightStats as
    { on?: number; total?: number } | undefined;
  const total = typeof stored?.total === "number" ? stored.total : ids.length;
  const on =
    typeof stored?.on === "number"
      ? stored.on
      : ids.filter((id) => lightState(hass, id).isOn).length;

  const toggle = (entityId: string): void => {
    actions.callService("light", "toggle", {}, { entity_id: entityId });
  };

  const setBrightness = (entityId: string, percent: number): void => {
    if (percent <= 0) {
      actions.callService("light", "turn_off", {}, { entity_id: entityId });
      return;
    }
    actions.callService(
      "light",
      "turn_on",
      { brightness_pct: percent },
      { entity_id: entityId },
    );
  };

  const turnAllOff = (): void => {
    const areas = [
      ...new Set(
        (model.rooms ?? [])
          .filter((room) => room.lights.length > 0)
          .map((room) => room.areaId),
      ),
    ];
    if (areas.length) {
      actions.callService("light", "turn_off", {}, { area_id: areas });
    } else if (ids.length) {
      actions.callService("light", "turn_off", {}, { entity_id: ids });
    }
  };

  const groupBlock = (group: LightGroupModel) => {
    const state = lightState(hass, group.entityId);
    const count = group.members.length + group.extra.length || 1;
    const members = group.members.map((id, index) => (
      <LightControl
        key={id}
        entityId={id}
        name={entityName(hass, id, String(index + 1))}
        state={lightState(hass, id)}
        showSlider={false}
        t={t}
        onToggle={() => toggle(id)}
        onBrightness={(percent) => setBrightness(id, percent)}
      />
    ));
    const extras = group.extra.map((id) => (
      <LightControl
        key={id}
        entityId={id}
        name={entityName(hass, id, t("lights.hoodLight"))}
        state={lightState(hass, id)}
        showSlider
        t={t}
        onToggle={() => toggle(id)}
        onBrightness={(percent) => setBrightness(id, percent)}
      />
    ));

    return (
      <div className={c("block")} key={group.entityId}>
        <div className={c("block-head")}>
          <div className={c("block-label")}>{group.name}</div>
          <div className={c("block-label")}>
            <b>{t("lights.groupCount", { count })}</b>
          </div>
        </div>
        <LightControl
          entityId={group.entityId}
          name={group.name}
          state={state}
          showSlider
          t={t}
          onToggle={() => toggle(group.entityId)}
          onBrightness={(percent) => setBrightness(group.entityId, percent)}
        />
        {group.members.length ? (
          <details className={c("light-details")}>
            <summary>
              {t("lights.singleSpots", {
                count: group.members.length,
              })}
            </summary>
            {members}
          </details>
        ) : null}
        {extras}
      </div>
    );
  };

  return (
    <div
      data-react-layer
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      <SheetHeader
        kicker={t("sheet.kickerLights")}
        title={t("sheet.titleLights")}
        sum={t("lights.summary", { on, total })}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        <div className={c("block")}>
          <div className={c("btn-row")}>
            <button
              type="button"
              className={c("btn danger")}
              data-act="sluk-alt"
              onClick={turnAllOff}
            >
              <Icon name="light" /> {t("lights.turnAllOff")}
            </button>
            <span className={c("status-line")} style={{ marginLeft: "auto" }}>
              <i className={c("dot", !!on && "warn")} />
              {on ? t("lights.onCount", { count: on }) : t("lights.allOff")}
            </span>
          </div>
          <div data-confirm />
        </div>
        {groups.length ? (
          groups.map(groupBlock)
        ) : (
          <div className={c("empty")}>
            <Icon name="light" />
            <span>{t("empty.dataYet")}</span>
          </div>
        )}
        <div className={c("note")}>{t("lights.footer")}</div>
      </div>
    </div>
  );
}
