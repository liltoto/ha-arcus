import { useState, type CSSProperties } from "react";
import { formatNumber } from "../../../format";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  OpeningModel,
  SecurityBatteryModel,
} from "../../../types";
import {
  useActions,
  useConfig,
  useHass,
  useModel,
  useTranslator,
} from "../../hooks";
import { EmptyState } from "../../atoms/EmptyState";
import { Icon } from "../../atoms/Icon";
import { BatteryRow } from "../../molecules/BatteryRow";
import { ConfirmBar } from "../../molecules/ConfirmBar";
import { OpeningRow } from "../../molecules/OpeningRow";
import { SheetHeader } from "../../molecules/SheetHeader";
import { ToggleRow } from "../../molecules/ToggleRow";
import type { LayerBodyProps } from "../../pages/layerRegistry";

interface SecurityOpening extends OpeningModel {
  isLeak: boolean;
}

const HOUSE_CELLS = [
  { x: 10, y: 10, w: 125, h: 95, cx: 72, labelY: 34, dotY: 78 },
  { x: 145, y: 10, w: 125, h: 95, cx: 207, labelY: 34, dotY: 78 },
  { x: 280, y: 10, w: 125, h: 95, cx: 342, labelY: 34, dotY: 78 },
  { x: 415, y: 10, w: 135, h: 95, cx: 482, labelY: 34, dotY: 78 },
  { x: 10, y: 115, w: 125, h: 95, cx: 72, labelY: 139, dotY: 183 },
  { x: 145, y: 115, w: 125, h: 95, cx: 207, labelY: 139, dotY: 183 },
  { x: 280, y: 115, w: 125, h: 95, cx: 342, labelY: 139, dotY: 183 },
  { x: 415, y: 115, w: 135, h: 95, cx: 482, labelY: 139, dotY: 183 },
] as const;

function languageOf(model: HomeModel, config: ArcusConfig): "da" | "en" {
  return model.language === "en" || config.language === "en" ? "en" : "da";
}

function liveOn(hass: ArcusHass, entityId: string): boolean | null {
  const state = hass.states?.[entityId]?.state;
  if (state === "on" || state === "open") return true;
  if (state === "off" || state === "closed") return false;
  return null;
}

function entityName(
  hass: ArcusHass,
  entityId: string,
  fallback: string,
): string {
  const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
  return typeof friendly === "string" && friendly.trim() ? friendly : fallback;
}

function openingIcon(opening: SecurityOpening): string {
  if (opening.isLeak) return "drop";
  if (/vindue|window/i.test(opening.kind)) return "wind";
  return "door";
}

function roomForOpening(
  model: HomeModel,
  opening: SecurityOpening,
): HomeModel["rooms"][number] | null {
  if (!opening.room) return null;
  return (
    model.rooms.find(
      (room) => room.name === opening.room || room.id === opening.room,
    ) ?? null
  );
}

function UnknownBatteryRow({ battery }: { battery: SecurityBatteryModel }) {
  return (
    <div className="row">
      <Icon name="battery" />
      <span className="row-main">
        <div className="row-name">{battery.name}</div>
        <div className="row-sub">–</div>
      </span>
      <div className="bar" data-batt={battery.entityId}>
        <i style={{ width: "0%" }} />
      </div>
      <span className="row-val">–</span>
    </div>
  );
}

/**
 * Security: the house schematic, every door/window/leak, battery levels, the
 * window-alert automation and the shortcut to the full alert list.
 *
 * The resolved security model carries the summary counts. Per-opening live
 * states come from `hass`; when a state is missing, the model's open count is
 * used as a deterministic fallback so the sheet never claims everything is
 * closed when the model says something is open.
 */
export function SecurityBody(_props: LayerBodyProps) {
  const hass = useHass();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const actions = useActions();
  const [confirmingAlertOff, setConfirmingAlertOff] = useState(false);
  const security = model.security;

  const close = () => actions.closeSheet();

  if (!security) {
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
          kicker={t("sheet.kickerSecurity")}
          title={t("sheet.titleSecurity")}
          sum="–"
          closeLabel={t("sheet.close")}
          onClose={close}
        />
        <div className="sheet-scroll">
          <EmptyState icon="shield" title={t("empty.data")} />
        </div>
      </div>
    );
  }

  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 0) =>
    formatNumber(value, digits, language);

  const leakIds = config.security?.leaks ?? [];
  const leakSet = new Set(leakIds);
  const openings: SecurityOpening[] = (security.openings ?? []).map(
    (opening) => ({
      ...opening,
      isLeak:
        leakSet.has(opening.id) ||
        /lækage|leak|vand/i.test(`${opening.kind} ${opening.name}`),
    }),
  );
  for (const [index, entityId] of leakIds.entries()) {
    if (openings.some((opening) => opening.id === entityId)) continue;
    const fallback =
      index === 0
        ? t("water.kitchen")
        : index === 1
          ? t("water.utility")
          : `${t("water.leak")} ${index + 1}`;
    openings.push({
      id: entityId,
      name: entityName(hass, entityId, fallback),
      kind: t("water.leak"),
      room: "",
      isLeak: true,
    });
  }

  const openStates = new Map<string, boolean>();
  let remainingOpen = security.open ?? 0;
  for (const opening of openings) {
    let state = liveOn(hass, opening.id);
    if (state === null) {
      if (opening.isLeak) {
        state = Boolean(security.leak);
      } else if (remainingOpen > 0) {
        state = true;
        remainingOpen -= 1;
      } else {
        state = false;
      }
    }
    openStates.set(opening.id, state);
  }

  const openCount =
    security.open ??
    openings.filter(
      (opening) => !opening.isLeak && openStates.get(opening.id) === true,
    ).length;
  const leak =
    Boolean(security.leak) ||
    openings.some(
      (opening) => opening.isLeak && openStates.get(opening.id) === true,
    );

  const houseRooms = model.rooms.slice(0, HOUSE_CELLS.length);
  const cellForOpening = (opening: SecurityOpening, index: number): number => {
    const room = roomForOpening(model, opening);
    const roomIndex = room
      ? houseRooms.findIndex((candidate) => candidate.id === room.id)
      : -1;
    return roomIndex >= 0 ? roomIndex : index % HOUSE_CELLS.length;
  };

  const houseDots = openings.map((opening, index) => {
    const cellIndex = cellForOpening(opening, index);
    const cell = HOUSE_CELLS[cellIndex];
    const slot = openings
      .slice(0, index)
      .filter(
        (_candidate, candidateIndex) =>
          cellForOpening(openings[candidateIndex], candidateIndex) ===
          cellIndex,
      ).length;
    const x = cell.cx + ((slot % 3) - 1) * 13;
    const y = cell.dotY + Math.floor(slot / 3) * 10;
    return (
      <circle
        key={opening.id}
        cx={x}
        cy={y}
        r="4"
        className={`house-dot${openStates.get(opening.id) ? " open" : ""}`}
        data-open={opening.id}
      />
    );
  });

  const openingRows = openings.map((opening) => {
    const open = openStates.get(opening.id) === true;
    const room = roomForOpening(model, opening);
    const roomName = opening.room || room?.name || "";
    const status = opening.isLeak
      ? open
        ? t("security.alarm")
        : t("security.dry")
      : open
        ? t("security.openUpper")
        : t("security.closedUpper");
    const nav = opening.isLeak ? "vand" : room ? `rum/${room.id}` : "sikkerhed";

    return (
      <div key={opening.id} data-nav={nav}>
        <OpeningRow
          name={opening.name}
          kind={opening.kind}
          room={roomName}
          isOpen={open}
          icon={openingIcon(opening)}
          status={status}
          onClick={() => actions.navigate(nav)}
        />
      </div>
    );
  });

  const batteries: SecurityBatteryModel[] = [
    ...(security.batteries ?? []),
  ].sort((a, b) => (a.level ?? 101) - (b.level ?? 101));
  const lowBattery = batteries.filter(
    (battery) => battery.level !== null && battery.level < 20,
  ).length;
  const alertId = config.security?.windowAlert;
  const alertOn = alertId
    ? (liveOn(hass, alertId) ?? Boolean(security.windowAlert))
    : Boolean(security.windowAlert);
  const openWindows = security.windows ?? security.open ?? 0;
  const alertCount = model.alerts?.length ?? 0;

  const toggleWindowAlert = (): void => {
    if (!alertId) return;
    if (alertOn) {
      setConfirmingAlertOff(true);
      return;
    }
    actions.callService("input_boolean", "toggle", {}, { entity_id: alertId });
  };

  const confirmAlertOff = (): void => {
    if (alertId) {
      actions.callService(
        "input_boolean",
        "toggle",
        {},
        { entity_id: alertId },
      );
    }
    setConfirmingAlertOff(false);
  };

  const summary = `${
    openCount
      ? t("security.summaryOpen", { count: openCount })
      : t("security.summaryClosed")
  } · ${leak ? t("security.leakDetected") : t("security.noLeak")}`;

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
        kicker={t("sheet.kickerSecurity")}
        title={t("sheet.titleSecurity")}
        sum={summary}
        closeLabel={t("sheet.close")}
        onClose={close}
      />
      <div className="sheet-scroll">
        <div className="block">
          <div className="block-label">{t("security.houseNow")}</div>
          <div className="house-wrap">
            <svg viewBox="0 0 560 220" className="house-svg" aria-hidden="true">
              {HOUSE_CELLS.map((cell, index) => {
                const room = houseRooms[index];
                const label = room
                  ? (room.name.length > 12
                      ? `${room.name.slice(0, 11)}…`
                      : room.name
                    ).toLocaleUpperCase()
                  : "";
                return (
                  <g key={index}>
                    <rect
                      x={cell.x}
                      y={cell.y}
                      width={cell.w}
                      height={cell.h}
                      rx="8"
                      className="house-room"
                    />
                    {room ? (
                      <text
                        x={cell.cx}
                        y={cell.labelY}
                        textAnchor="middle"
                        className="house-name"
                      >
                        {label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {houseDots}
            </svg>
            <div className="legend">
              <span>
                <i style={{ "--c": "var(--sage)" } as CSSProperties} />
                {t("security.closed")}
              </span>
              <span>
                <i style={{ "--c": "var(--coral)" } as CSSProperties} />
                {t("security.open")}
              </span>
            </div>
            <div className="chip-row" data-security-chips>
              <span
                className={`chip${leak ? " crit" : " on"}`}
                data-chip="leak"
                data-sev={leak ? "crit" : "ok"}
              >
                {leak ? t("security.leakDetected") : t("security.noLeak")}
              </span>
              <span
                className={`chip${openCount ? " warn" : " on"}`}
                data-chip="open"
                data-sev={openCount ? "warn" : "ok"}
              >
                {openCount
                  ? t("security.summaryOpen", { count: openCount })
                  : t("security.summaryClosed")}
              </span>
              {lowBattery ? (
                <span className="chip warn" data-chip="battery" data-sev="warn">
                  {t("security.batteries")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="block">
          <div className="block-head">
            <div className="block-label">{t("security.doorsWindows")}</div>
            <div className="block-label">
              <b>
                {openCount
                  ? t("security.summaryOpen", { count: openCount })
                  : t("security.summaryClosed")}
              </b>
            </div>
          </div>
          <div className="list">
            {openingRows.length ? (
              openingRows
            ) : (
              <div className="block-note">{t("empty.data")}</div>
            )}
          </div>
        </div>

        {batteries.length ? (
          <div className="block">
            <div className="block-head">
              <div className="block-label">{t("security.batteries")}</div>
              <div className="block-label">
                <b>{t("security.lowestFirst")}</b>
              </div>
            </div>
            <div className="battery-list">
              {batteries.map((battery) =>
                battery.level === null ? (
                  <UnknownBatteryRow key={battery.entityId} battery={battery} />
                ) : (
                  <BatteryRow
                    key={battery.entityId}
                    name={battery.name}
                    value={battery.level}
                    sub={
                      battery.level < 20
                        ? t("security.changeSoon")
                        : t("security.ok")
                    }
                    entity={battery.entityId}
                  />
                ),
              )}
            </div>
          </div>
        ) : null}

        <div className="block">
          <div className="block-label">{t("security.automation")}</div>
          {alertId ? (
            <ToggleRow
              label={t("security.windowAlert")}
              sub={t("security.windowAlertSub")}
              isOn={alertOn}
              dataAct="toggle-bool"
              dataEntity={alertId}
              onChange={toggleWindowAlert}
            />
          ) : (
            <div className="row">
              <span className="row-main">
                <div className="row-name">{t("security.windowAlert")}</div>
                <div className="row-sub">{t("security.windowAlertSub")}</div>
              </span>
              <span className="row-val">
                {alertOn ? t("common.on") : t("common.off")}
              </span>
            </div>
          )}
          <div className="row">
            <span className="row-main">
              <div className="row-name">{t("security.openWindows")}</div>
              <div className="row-sub">{t("security.liveCount")}</div>
            </span>
            <span className="row-val">{fmt(openWindows, 0)}</span>
          </div>
          <div className="row">
            <Icon name="bell" />
            <div className="row-main">
              <div className="row-name">{t("sheet.titleAlerts")}</div>
              <div className="row-sub">
                {alertCount
                  ? t("alerts.summaryCount", { count: alertCount })
                  : t("alerts.summaryCalm")}
              </div>
            </div>
            <button
              type="button"
              className="btn small"
              data-act="alarm-action"
              onClick={() => actions.navigate("alarmer")}
            >
              {t("alerts.see")}
            </button>
          </div>
          {confirmingAlertOff ? (
            <ConfirmBar
              text={t("security.windowAlertSub")}
              confirmAct="toggle-bool"
              confirmLabel={t("common.confirm")}
              cancelLabel={t("common.cancel")}
              onConfirm={confirmAlertOff}
              onCancel={() => setConfirmingAlertOff(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
