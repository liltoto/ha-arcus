import { formatNumber } from "../../../../format";
import type {
  ArcusConfig,
  ArcusHass,
  HomeModel,
  OpeningModel,
  SecurityBatteryModel,
  SecurityLockModel,
  SecurityModel,
  Translator,
} from "../../../../types";

/** The fixed eight-cell grid the house schematic is drawn on. */
export const HOUSE_CELLS = [
  { x: 10, y: 10, w: 125, h: 95, cx: 72, labelY: 34, dotY: 78 },
  { x: 145, y: 10, w: 125, h: 95, cx: 207, labelY: 34, dotY: 78 },
  { x: 280, y: 10, w: 125, h: 95, cx: 342, labelY: 34, dotY: 78 },
  { x: 415, y: 10, w: 135, h: 95, cx: 482, labelY: 34, dotY: 78 },
  { x: 10, y: 115, w: 125, h: 95, cx: 72, labelY: 139, dotY: 183 },
  { x: 145, y: 115, w: 125, h: 95, cx: 207, labelY: 139, dotY: 183 },
  { x: 280, y: 115, w: 125, h: 95, cx: 342, labelY: 139, dotY: 183 },
  { x: 415, y: 115, w: 135, h: 95, cx: 482, labelY: 139, dotY: 183 },
] as const;

interface SecurityOpening extends OpeningModel {
  isLeak: boolean;
}

export interface SecurityHouseDot {
  id: string;
  cx: number;
  cy: number;
  open: boolean;
}

export interface SecurityOpeningRow {
  id: string;
  name: string;
  kind: string;
  room: string;
  isOpen: boolean;
  icon: string;
  status: string;
  nav: string;
}

/** Everything the security sheet renders, resolved once per render. */
export interface SecurityView {
  openings: SecurityOpeningRow[];
  dots: SecurityHouseDot[];
  openCount: number;
  leak: boolean;
  locks: SecurityLockModel[];
  batteries: SecurityBatteryModel[];
  lowBattery: number;
  alarmId: string | null;
  alarmState: string | null;
  alertId: string | undefined;
  alertOn: boolean;
  openWindowsLabel: string;
  alertCount: number;
  summary: string;
}

export const alarmStateLabel = (
  t: Translator,
  state: string | null,
): string => {
  if (state === "armed_home") return t("security.armedHome");
  if (state === "armed_away") return t("security.armedAway");
  if (state === "disarmed") return t("security.disarmed");
  return state || "–";
};

const liveOn = (hass: ArcusHass, entityId: string): boolean | null => {
  const state = hass.states?.[entityId]?.state;
  if (state === "on" || state === "open") return true;
  if (state === "off" || state === "closed") return false;
  return null;
};

const entityName = (
  hass: ArcusHass,
  entityId: string,
  fallback: string,
): string => {
  const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
  return typeof friendly === "string" && friendly.trim() ? friendly : fallback;
};

const openingIcon = (opening: SecurityOpening): string => {
  if (opening.isLeak) return "drop";
  if (/vindue|window/i.test(opening.kind)) return "wind";
  return "door";
};

const roomForOpening = (
  model: HomeModel,
  opening: SecurityOpening,
): HomeModel["rooms"][number] | null => {
  if (!opening.room) return null;
  return (
    model.rooms.find(
      (room) => room.name === opening.room || room.id === opening.room,
    ) ?? null
  );
};

const securityOpenings = (
  hass: ArcusHass,
  security: SecurityModel,
  config: ArcusConfig,
  t: Translator,
): SecurityOpening[] => {
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

  return openings;
};

/**
 * Live open state per opening. Missing states fall back to the model's open
 * count, so a partial hass snapshot never claims everything is closed.
 */
const openStatesFor = (
  hass: ArcusHass,
  security: SecurityModel,
  openings: SecurityOpening[],
): Map<string, boolean> => {
  const states = new Map<string, boolean>();
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
    states.set(opening.id, state);
  }

  return states;
};

const cellForOpening = (
  model: HomeModel,
  houseRooms: HomeModel["rooms"],
  opening: SecurityOpening,
  index: number,
): number => {
  const room = roomForOpening(model, opening);
  const roomIndex = room
    ? houseRooms.findIndex((candidate) => candidate.id === room.id)
    : -1;
  return roomIndex >= 0 ? roomIndex : index % HOUSE_CELLS.length;
};

const houseDotsFor = (
  model: HomeModel,
  openings: SecurityOpening[],
  openStates: Map<string, boolean>,
): SecurityHouseDot[] => {
  const houseRooms = model.rooms.slice(0, HOUSE_CELLS.length);

  return openings.map((opening, index) => {
    const cellIndex = cellForOpening(model, houseRooms, opening, index);
    const cell = HOUSE_CELLS[cellIndex];
    const slot = openings
      .slice(0, index)
      .filter(
        (_candidate, candidateIndex) =>
          cellForOpening(
            model,
            houseRooms,
            openings[candidateIndex],
            candidateIndex,
          ) === cellIndex,
      ).length;
    return {
      id: opening.id,
      cx: cell.cx + ((slot % 3) - 1) * 13,
      cy: cell.dotY + Math.floor(slot / 3) * 10,
      open: openStates.get(opening.id) === true,
    };
  });
};

const openingRowsFor = (
  model: HomeModel,
  openings: SecurityOpening[],
  openStates: Map<string, boolean>,
  t: Translator,
): SecurityOpeningRow[] => {
  return openings.map((opening) => {
    const isOpen = openStates.get(opening.id) === true;
    const room = roomForOpening(model, opening);
    const status = opening.isLeak
      ? isOpen
        ? t("security.alarm")
        : t("security.dry")
      : isOpen
        ? t("security.openUpper")
        : t("security.closedUpper");

    return {
      id: opening.id,
      name: opening.name,
      kind: opening.kind,
      room: opening.room || room?.name || "",
      isOpen,
      icon: openingIcon(opening),
      status,
      nav: opening.isLeak ? "vand" : room ? `rum/${room.id}` : "sikkerhed",
    };
  });
};

const alarmFor = (
  hass: ArcusHass,
  security: SecurityModel,
  config: ArcusConfig,
): { id: string | null; state: string | null } => {
  const id = security.alarm?.entityId ?? config.security?.alarm ?? null;
  const state = id
    ? (hass.states?.[id]?.state ?? security.alarm?.state ?? "unknown")
    : null;
  return { id, state };
};

const batteriesFor = (
  security: SecurityModel,
): {
  batteries: SecurityBatteryModel[];
  lowBattery: number;
} => {
  const batteries = [...(security.batteries ?? [])].sort(
    (a, b) => (a.level ?? 101) - (b.level ?? 101),
  );
  const lowBattery = batteries.filter(
    (battery) => battery.level !== null && battery.level < 20,
  ).length;
  return { batteries, lowBattery };
};

const alertFor = (
  hass: ArcusHass,
  security: SecurityModel,
  config: ArcusConfig,
): { id: string | undefined; on: boolean } => {
  const id = config.security?.windowAlert;
  const on = id
    ? (liveOn(hass, id) ?? Boolean(security.windowAlert))
    : Boolean(security.windowAlert);
  return { id, on };
};

const summaryFor = (
  openCount: number,
  leak: boolean,
  t: Translator,
): string => {
  return `${
    openCount
      ? t("security.summaryOpen", { count: openCount })
      : t("security.summaryClosed")
  } · ${leak ? t("security.leakDetected") : t("security.noLeak")}`;
};

export const resolveSecurityView = (
  hass: ArcusHass,
  model: HomeModel,
  config: ArcusConfig,
  security: SecurityModel,
  t: Translator,
): SecurityView => {
  const language = model.language;
  const locks = security.locks ?? [];
  const alarm = alarmFor(hass, security, config);

  const openings = securityOpenings(hass, security, config, t);
  const openStates = openStatesFor(hass, security, openings);
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

  const { batteries, lowBattery } = batteriesFor(security);
  const alert = alertFor(hass, security, config);
  const openWindows = security.windows ?? security.open ?? 0;
  const alertCount = model.alerts?.length ?? 0;

  return {
    openings: openingRowsFor(model, openings, openStates, t),
    dots: houseDotsFor(model, openings, openStates),
    openCount,
    leak,
    locks,
    batteries,
    lowBattery,
    alarmId: alarm.id,
    alarmState: alarm.state,
    alertId: alert.id,
    alertOn: alert.on,
    openWindowsLabel: formatNumber(openWindows, 0, language),
    alertCount,
    summary: summaryFor(openCount, leak, t),
  };
};
