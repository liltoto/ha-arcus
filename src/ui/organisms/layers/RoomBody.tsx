import { Fragment, useEffect, type CSSProperties } from "react";
import { formatNumber, formatUnit } from "../../../format";
import type {
  ArcusHass,
  EntityRef,
  Language,
  Translator,
} from "../../../types";
import { EmptyState } from "../../atoms/EmptyState";
import { Icon } from "../../atoms/Icon";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import {
  useActions,
  useConfig,
  useHass,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useTranslator,
} from "../../hooks";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { RoomChart } from "./room/RoomChart";
import { RoomLightRow } from "./room/RoomLightRow";
import { RoomStepper } from "./room/RoomStepper";
import {
  entityName,
  isOn,
  languageOf,
  lightName,
  lightStateFor,
  liveEntity,
  numberFrom,
  numberOf,
  openingIcon,
  refEntity,
  resolveRoom,
  roomStatFor,
} from "./room/room-state";

const LAYER_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  minHeight: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function relativeChanged(
  hass: ArcusHass,
  t: Translator,
  nowMs: number,
  entityId: string,
): string {
  const raw = liveEntity(hass, entityId)?.last_changed;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const minutes = Math.round((nowMs - date.getTime()) / 60_000);
  if (minutes < 2) return t("room.relativeNow");
  if (minutes < 60) return t("room.relativeMinutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("room.relativeHours", { count: hours });
  return t("room.relativeDays", { count: Math.round(hours / 24) });
}

function airSummary(
  t: Translator,
  humidity: number | null,
  co2: number | null,
  language: Language,
): string {
  if (co2 !== null) {
    return `${t("room.air")} ${formatUnit(co2, "ppm", language, 0)}`;
  }
  if (humidity !== null) {
    return `${t("room.humidityShort")} ${formatUnit(
      humidity,
      "%",
      language,
      0,
    )}`;
  }
  return `${t("room.air")} –`;
}

/**
 * The room sheet, ported from `views/layers/room.ts`.
 *
 * `route.base === "skur"` is the special top-level shed route; every other
 * room uses `route.sub`. Unknown rooms fall back to the first non-skur room,
 * matching the prototype's first-room fallback.
 */
export function RoomBody({ route }: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const history = useHistory();
  useHistoryVersion();
  const now = useNow();
  const actions = useActions();

  const room = resolveRoom(model, route);
  const language = languageOf(model, config, t);
  const nowMs = now().getTime();

  useEffect(() => {
    if (!room) return;
    const directTemp = numberOf(hass, room.temp);
    const tempChartId =
      directTemp !== null
        ? room.temp?.entityId
        : (room.tempFallback?.entityId ?? room.temp?.entityId);
    const ids = [
      tempChartId,
      room.humidity?.entityId,
      room.co2?.entityId,
      room.pm25?.entityId,
    ].filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length) void history.ensure(ids, 24);
  }, [hass, history, room]);

  if (!room) {
    return (
      <div data-react-layer style={LAYER_STYLE}>
        <SheetHeader
          kicker={t("sheet.kickerRoom")}
          title={t("empty.rooms")}
          sum=""
          closeLabel={t("sheet.close")}
          onClose={actions.closeSheet}
        />
        <div className="sheet-scroll">
          <EmptyState icon="home" title={t("empty.dataYet")} />
        </div>
      </div>
    );
  }

  const stat = roomStatFor(hass, model, room);
  const directTemp = numberOf(hass, room.temp);
  const temp =
    directTemp ??
    stat.temp ??
    numberFrom(room.tempFallback?.attributes?.current_temperature);
  const humidity = numberOf(hass, room.humidity) ?? stat.humidity;
  const co2 = numberOf(hass, room.co2) ?? stat.co2;
  const pm25 = numberOf(hass, room.pm25);

  const tempChartId =
    directTemp !== null
      ? room.temp?.entityId
      : (room.tempFallback?.entityId ?? room.temp?.entityId);

  const lightsText = stat.lightsTotal
    ? t("room.lightsCount", {
        on: stat.lightsOn,
        total: stat.lightsTotal,
      })
    : "";
  const openText = room.openings.length
    ? stat.open
      ? t("room.openCount", { count: stat.open })
      : t("room.closed")
    : "";
  const summary = `${formatNumber(temp, 1, language)}° · ${airSummary(
    t,
    humidity,
    co2,
    language,
  )}${lightsText ? ` · ${lightsText}` : ""}${openText ? ` · ${openText}` : ""}`;

  const fallbackNote =
    room.tempFallback && directTemp === null && stat.temp !== null;

  const toggleLight = (entityId: string): void => {
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

  const light = (entityId: string, name: string, showSlider: boolean) => {
    const state = lightStateFor(hass, entityId);
    return (
      <RoomLightRow
        key={entityId}
        entityId={entityId}
        name={name}
        isOn={state.isOn}
        brightness={state.pct}
        showSlider={showSlider}
        t={t}
        onToggle={() => toggleLight(entityId)}
        onBrightness={(percent) => setBrightness(entityId, percent)}
      />
    );
  };

  const climateRef = room.climate;
  const climate = refEntity(hass, climateRef);
  const currentTemp = numberFrom(climate?.attributes?.current_temperature);
  const targetTemp = numberFrom(climate?.attributes?.temperature);
  const climateMode = climate?.state;
  const targetText =
    targetTemp === null ? "–" : `${formatNumber(targetTemp, 1, language)}°`;
  const currentText =
    currentTemp === null ? "–" : `${formatNumber(currentTemp, 1, language)}°`;

  const stepClimate = (ref: EntityRef, direction: -1 | 1): void => {
    const entity = refEntity(hass, ref);
    const current = numberFrom(entity?.attributes?.temperature);
    const min = Number(entity?.attributes?.min_temp ?? 5);
    const max = Number(entity?.attributes?.max_temp ?? 35);
    if (current === null || !Number.isFinite(current)) return;
    const next = clamp(current + direction * 0.5, min, max);
    actions.callService(
      "climate",
      "set_temperature",
      { temperature: next },
      { entity_id: ref.entityId },
    );
  };

  const toggleClimate = (ref: EntityRef): void => {
    const mode = refEntity(hass, ref)?.state;
    actions.callService(
      "climate",
      "set_hvac_mode",
      { hvac_mode: mode === "off" ? "heat" : "off" },
      { entity_id: ref.entityId },
    );
  };

  const fanRef = room.fan;
  const fan = refEntity(hass, fanRef);
  const filterHours = numberOf(hass, room.filter);
  const resetId = [room.filterAlarm?.entityId, room.filter?.entityId].find(
    (id): id is string => typeof id === "string" && id.startsWith("button."),
  );

  const motionOn = room.motion
    ? isOn(hass, room.motion.entityId, room.motion)
    : false;
  const lux = numberOf(hass, room.illuminance);

  const battery = refEntity(hass, room.battery);
  const batteryLevel = numberOf(hass, room.battery);

  const media = refEntity(hass, room.media);
  const mediaRef = room.media;
  const mediaState = media?.state;
  const mediaStateText =
    mediaState === "playing"
      ? t("room.playing")
      : mediaState === "off"
        ? t("room.heatingOff")
        : (mediaState ?? "–");

  return (
    <div data-react-layer style={LAYER_STYLE}>
      <SheetHeader
        kicker={t("sheet.kickerRoom")}
        title={room.name}
        sum={summary}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className="sheet-scroll">
        <div className="readings">
          <Readout
            label={t("room.temperature")}
            value={formatNumber(temp, 1, language)}
            unit="°C"
          />
          <Readout
            label={t("room.humidity")}
            value={humidity === null ? "–" : String(Math.round(humidity))}
            unit="%"
          />
          <Readout
            label={t("room.co2")}
            value={co2 === null ? "–" : String(Math.round(co2))}
            unit="ppm"
          />
          <Readout
            label={t("room.pm25")}
            value={pm25 === null ? "–" : formatNumber(pm25, 1, language)}
            unit="µg/m³"
          />
        </div>
        {fallbackNote ? (
          <div className="block-note">{t("room.tempFallbackNote")}</div>
        ) : null}
        <div className="block">
          <div className="block-head">
            <div className="block-label">
              {t("room.chart24", { label: t("room.temperature") })}
            </div>
            <div className="block-label">
              <b>{formatNumber(temp, 1, language)}°</b>
            </div>
          </div>
          <RoomChart
            history={history}
            entityId={tempChartId}
            color="var(--sky)"
            height={120}
            unit="°C"
            decimals={1}
            emptyLabel={t("empty.chart")}
            now={now}
          />
        </div>
        {room.humidity ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">
                {t("room.chart24", { label: t("room.humidity") })}
              </div>
              <div className="block-label">
                <b>{humidity === null ? "–" : `${Math.round(humidity)} %`}</b>
              </div>
            </div>
            <RoomChart
              history={history}
              entityId={room.humidity.entityId}
              color="var(--sky)"
              height={100}
              unit="%"
              decimals={0}
              emptyLabel={t("empty.chart")}
              now={now}
            />
          </div>
        ) : null}
        {room.co2 ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">
                {t("room.chart24", { label: t("room.co2") })}
              </div>
              <div className="block-label">
                <b>{co2 === null ? "–" : `${Math.round(co2)} ppm`}</b>
              </div>
            </div>
            <RoomChart
              history={history}
              entityId={room.co2.entityId}
              color="var(--sage)"
              height={100}
              unit="ppm"
              decimals={0}
              emptyLabel={t("empty.chart")}
              now={now}
            />
          </div>
        ) : null}
        {room.pm25 ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">
                {t("room.chart24", { label: t("room.pm25") })}
              </div>
              <div className="block-label">
                <b>{pm25 === null ? "–" : formatNumber(pm25, 1, language)}</b>
              </div>
            </div>
            <RoomChart
              history={history}
              entityId={room.pm25.entityId}
              color="var(--brass)"
              height={90}
              unit="µg/m³"
              decimals={1}
              emptyLabel={t("empty.chart")}
              now={now}
            />
          </div>
        ) : null}
        {room.lights.length ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.lights")}</div>
              <div className="block-label">
                <b>
                  {t("room.lightCountOf", {
                    on: stat.lightsOn,
                    total: stat.lightsTotal,
                  })}
                </b>
              </div>
            </div>
            <div className="list">
              {room.lights.map((group) => (
                <Fragment key={group.entityId}>
                  {light(group.entityId, group.name, true)}
                  {group.members.length ? (
                    <details className="light-details">
                      <summary>
                        {t("room.singleLights", {
                          count: group.members.length,
                        })}
                      </summary>
                      {group.members.map((id) =>
                        light(id, lightName(hass, id), false),
                      )}
                    </details>
                  ) : null}
                  {group.extra.map((id) =>
                    light(id, lightName(hass, id), true),
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        ) : null}
        {room.openings.length ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.openings")}</div>
              <div className="block-label">
                <b>
                  {stat.open
                    ? t("room.openCount", { count: stat.open })
                    : t("common.allClosedLower")}
                </b>
              </div>
            </div>
            <div className="list">
              {room.openings.map((opening) => {
                const on = isOn(hass, opening.id);
                const relative = relativeChanged(hass, t, nowMs, opening.id);
                return (
                  <div
                    className={`row${on ? " open" : ""}`}
                    data-open={opening.id}
                    key={opening.id}
                  >
                    <Icon name={openingIcon(opening.kind)} />
                    <div className="row-main">
                      <div className="row-name">{opening.name}</div>
                      <div className="row-sub">
                        {`${opening.kind} · ${
                          on ? t("common.open") : t("common.closed")
                        } ${relative}`}
                      </div>
                    </div>
                    <span className="status-line">
                      <i className={`dot${on ? " warn" : ""}`} />
                      {on ? t("common.openUpper") : t("common.closedUpper")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {climateRef && climate ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.heating")}</div>
              <div className="block-label">
                <b>
                  {climateMode === "off"
                    ? t("room.heatingOff")
                    : t("room.heatingOn")}
                </b>
              </div>
            </div>
            <div className="row">
              <span className="row-main">
                <div className="row-name">{room.name}</div>
                <div className="row-sub">
                  {`${t("room.heatingNow", {
                    temp: currentText,
                  })} · ${
                    climate?.attributes?.hvac_action === "heating"
                      ? t("room.heatingActive")
                      : t("room.heatingHolding")
                  }`}
                </div>
              </span>
              <RoomStepper
                entityId={climateRef.entityId}
                value={targetText}
                language={language}
                onStep={(direction) => stepClimate(climateRef, direction)}
              />
              <button
                type="button"
                className={`toggle${climateMode !== "off" ? " on" : ""}`}
                data-act="hvac-toggle"
                data-entity={climateRef.entityId}
                data-not-off={climateRef.entityId}
                aria-label={t("common.toggle")}
                aria-pressed={climateMode !== "off"}
                onClick={() => toggleClimate(climateRef)}
              />
            </div>
            <div className="block-note">
              {t("room.setpointNote", { temp: targetText })}
            </div>
          </div>
        ) : null}
        {fanRef && fan ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.hood")}</div>
              <div className="block-label">
                <b>
                  {isOn(hass, fanRef.entityId, fanRef)
                    ? t("room.heatingOn")
                    : t("room.heatingOff")}
                </b>
              </div>
            </div>
            <div className="row">
              <Icon name="fan" />
              <div className="row-main">
                <div className="row-name">{entityName(fan, "Thermex")}</div>
                <div className="row-sub">
                  {t("room.filterTime", {
                    hours: formatNumber(filterHours, 1, language),
                  })}
                </div>
              </div>
              <span className="row-val">
                {String(fan?.attributes?.preset_mode ?? "–")}
              </span>
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn small"
                data-act="toggle-switch"
                data-entity={fanRef.entityId}
                onClick={() =>
                  actions.callService(
                    "switch",
                    "toggle",
                    {},
                    { entity_id: fanRef.entityId },
                  )
                }
              >
                {t("room.toggle")}
              </button>
              {resetId ? (
                <button
                  type="button"
                  className="btn small"
                  data-act="press-button"
                  data-entity={resetId}
                  onClick={() =>
                    actions.callService(
                      "button",
                      "press",
                      {},
                      { entity_id: resetId },
                    )
                  }
                >
                  {t("room.resetFilter")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {room.motion ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.motionLight")}</div>
            </div>
            <div className="readings">
              <Readout
                label={t("room.motion")}
                value={motionOn ? t("room.active") : t("room.calm")}
              />
              <Readout
                label={t("room.illuminance")}
                value={lux === null ? "–" : String(Math.round(lux))}
                unit="lx"
              />
            </div>
          </div>
        ) : null}
        {room.battery ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.battery")}</div>
            </div>
            <div className="row">
              <Icon name="battery" />
              <div className="row-main">
                <div className="row-name">
                  {entityName(battery, t("room.battery"))}
                </div>
                <div className="row-sub">{room.name}</div>
              </div>
              <span className="row-val">
                {batteryLevel === null ? "–" : Math.round(batteryLevel)}
                <small>%</small>
              </span>
            </div>
          </div>
        ) : null}
        {mediaRef ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("room.media")}</div>
              <div className="block-label">
                <b>{mediaStateText}</b>
              </div>
            </div>
            <div className="row">
              <Icon name="play" />
              <div className="row-main">
                <div className="row-name">
                  {entityName(media, t("room.soundbar"))}
                </div>
                <div className="row-sub">{room.name}</div>
              </div>
              <button
                type="button"
                className="icon-btn"
                data-act="media-toggle"
                data-entity={mediaRef.entityId}
                aria-label={t("room.playing")}
                onClick={() =>
                  actions.callService(
                    "media_player",
                    "media_play_pause",
                    {},
                    { entity_id: mediaRef.entityId },
                  )
                }
              >
                <Icon name={mediaState === "playing" ? "pause" : "play"} />
              </button>
            </div>
          </div>
        ) : null}
        <div className="note">{t("room.liveNote")}</div>
      </div>
    </div>
  );
}
