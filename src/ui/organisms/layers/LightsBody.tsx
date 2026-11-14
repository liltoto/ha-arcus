import type { LightGroupModel } from "../../../types";
import { lightIdsForGroups } from "../../../model/lights";
import { useActions, useHass, useModel, useTranslator } from "../../hooks";
import { Icon } from "../../atoms/Icon";
import { SheetHeader } from "../../molecules/SheetHeader";
import { c } from "../../styles/classes";
import { RoomLightRow } from "./room/RoomLightRow";
import { lightName, lightStateFor } from "./room/room-state";

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
  const ids = lightIdsForGroups(groups);
  const stored = model.lightStats as
    { on?: number; total?: number } | undefined;
  const total = typeof stored?.total === "number" ? stored.total : ids.length;
  const on =
    typeof stored?.on === "number"
      ? stored.on
      : ids.filter((id) => lightStateFor(hass, id).isOn).length;

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
    const state = lightStateFor(hass, group.entityId);
    const count = group.members.length + group.extra.length || 1;
    const members = group.members.map((id, index) => {
      const memberState = lightStateFor(hass, id);
      return (
        <RoomLightRow
          key={id}
          entityId={id}
          name={lightName(hass, id, String(index + 1))}
          isOn={memberState.isOn}
          brightness={memberState.pct}
          showSlider={false}
          offWhenZero
          t={t}
          onToggle={() => toggle(id)}
          onBrightness={(percent) => setBrightness(id, percent)}
        />
      );
    });
    const extras = group.extra.map((id) => {
      const extraState = lightStateFor(hass, id);
      return (
        <RoomLightRow
          key={id}
          entityId={id}
          name={lightName(hass, id, t("lights.hoodLight"))}
          isOn={extraState.isOn}
          brightness={extraState.pct}
          showSlider
          offWhenZero
          t={t}
          onToggle={() => toggle(id)}
          onBrightness={(percent) => setBrightness(id, percent)}
        />
      );
    });

    return (
      <div className={c("block")} key={group.entityId}>
        <div className={c("block-head")}>
          <div className={c("block-label")}>{group.name}</div>
          <div className={c("block-label")}>
            <b>{t("lights.groupCount", { count })}</b>
          </div>
        </div>
        <RoomLightRow
          entityId={group.entityId}
          name={group.name}
          isOn={state.isOn}
          brightness={state.pct}
          showSlider
          offWhenZero
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
