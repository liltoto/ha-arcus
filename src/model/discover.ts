import { createTranslator, resolveLanguage } from "../localize";
import type {
  ArcusConfig,
  ArcusHass,
  EntityRef,
  EntityRegistryEntry,
  LightGroupModel,
  OpeningModel,
  RoomKind,
  RoomModel,
  RoomOverrideConfig,
  Translator,
} from "../types";

/**
 * The room tints from the prototype, in order. A room gets the tint at its
 * position in the discovered area order unless `rooms.<id>.tint` overrides it.
 */
export const ROOM_TINTS = [
  "#7FAFC4",
  "#D8A657",
  "#9A86C8",
  "#8FB08B",
  "#E0785E",
  "#6FA8A0",
];

/** HA area icons mapped onto the icon names the prototype actually ships. */
const AREA_ICON_KEYS: Record<string, string> = {
  sofa: "sofa",
  "sofa-outline": "sofa",
  couch: "sofa",
  "seat-outline": "sofa",
  "table-furniture": "sofa",
  countertop: "counter",
  counter: "counter",
  fridge: "counter",
  "fridge-outline": "counter",
  kitchen: "counter",
  stove: "counter",
  "stove-outline": "counter",
  bed: "bed",
  "bed-king": "bed",
  "bed-double": "bed",
  desk: "desk",
  "desk-chair": "desk",
  "washing-machine": "washer",
  "washing-machine-outline": "washer",
  "tumble-dryer": "washer",
  washer: "washer",
  door: "door",
  "door-open": "door",
  "door-closed": "door",
  "home-variant-outline": "shed",
  "home-variant": "home",
  home: "home",
  house: "home",
  garage: "shed",
  "garage-variant": "shed",
  shed: "shed",
  stairs: "stairs",
  "stairs-up": "stairs",
  "stairs-down": "stairs",
  shower: "home",
  bathtub: "home",
  toilet: "home",
  "office-building": "desk",
  monitor: "desk",
};

const OPENING_CLASSES = new Set(["door", "window", "garage_door", "opening"]);

function openingKind(deviceClass: string, t: Translator): string {
  switch (deviceClass) {
    case "door":
      return t("room.openingDoor");
    case "window":
      return t("room.openingWindow");
    case "garage_door":
      return t("room.openingGarage");
    case "opening":
      return t("room.openingGeneric");
    default:
      return deviceClass || t("room.openingGeneric");
  }
}

function inferRoomKind(
  areaId: string,
  roomName: string,
  overrideKind?: RoomKind,
): RoomKind {
  if (overrideKind) return overrideKind;
  if (
    areaId === "skur" ||
    /^(skur|outdoor|outside|ude|garage|shed|garden|have|terrasse|patio|carport|balcony|altan)$/i.test(
      areaId,
    ) ||
    /\b(skur|outdoor|outside|garage|shed|garden|terrasse|carport|balcony)\b/i.test(
      roomName,
    )
  ) {
    return "outdoor";
  }
  if (/bryggers|utility|laundry|teknik/i.test(`${areaId} ${roomName}`)) {
    return "utility";
  }
  return "indoor";
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const id = value.trim();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function domainOf(entityId: string): string {
  return entityId.includes(".") ? entityId.slice(0, entityId.indexOf(".")) : "";
}

function attrOf(hass: ArcusHass, entityId: string, key: string): unknown {
  return hass.states[entityId]?.attributes?.[key];
}

function isAvailable(state: string | undefined): boolean {
  return (
    typeof state === "string" &&
    state !== "" &&
    state !== "unavailable" &&
    state !== "unknown"
  );
}

function displayName(hass: ArcusHass, entityId: string): string {
  const state = hass.states[entityId];
  const registry = hass.entities[entityId];
  return (
    String(state?.attributes?.friendly_name ?? "").trim() ||
    String(registry?.name ?? "").trim() ||
    String(registry?.original_name ?? "").trim() ||
    entityId
  );
}

function areaIdForEntity(
  hass: ArcusHass,
  entity: EntityRegistryEntry,
): string | null {
  if (entity.area_id) return entity.area_id;
  if (entity.device_id) {
    const device = hass.devices[entity.device_id];
    if (device?.area_id) return device.area_id;
  }
  return null;
}

/**
 * The registry entities that belong to an area.
 *
 * An entity belongs to the area it is explicitly assigned to, or — when it has
 * no area of its own — to the area of its device. Hidden and disabled entities,
 * diagnostic/config entities, and registry entries without a live state are
 * not part of the dashboard.
 */
export function entitiesForArea(
  hass: ArcusHass,
  areaId: string,
): EntityRegistryEntry[] {
  const out: EntityRegistryEntry[] = [];
  for (const entity of Object.values(hass.entities ?? {})) {
    if (!entity?.entity_id) continue;
    if (!hass.states?.[entity.entity_id]) continue;
    if (entity.hidden_by) continue;
    if (entity.disabled_by) continue;
    if (
      entity.entity_category === "diagnostic" ||
      entity.entity_category === "config"
    ) {
      continue;
    }
    if (areaIdForEntity(hass, entity) !== areaId) continue;
    out.push(entity);
  }
  return out;
}

/** Map an HA area icon (`mdi:sofa`) onto one of the prototype icon names. */
function areaIconKey(icon: string | null | undefined): string {
  if (!icon) return "home";
  const name = String(icon).trim().replace(/^mdi:/i, "").toLowerCase();
  if (AREA_ICON_KEYS[name]) return AREA_ICON_KEYS[name];
  if (/sofa|couch|seat|table/.test(name)) return "sofa";
  if (/bed/.test(name)) return "bed";
  if (/desk|office|monitor/.test(name)) return "desk";
  if (/wash|dryer|laundry/.test(name)) return "washer";
  if (/door/.test(name)) return "door";
  if (/stair/.test(name)) return "stairs";
  if (/garage|shed/.test(name)) return "shed";
  if (/counter|kitchen|fridge|oven|stove/.test(name)) return "counter";
  return "home";
}

/**
 * Name-based fallback for areas whose icon is unset. Home Assistant does not
 * require an area icon, and the current home has two icon-less areas (Entre
 * and Lille Gang) that should still read as a door and a staircase.
 */
function areaNameIcon(name: string): string {
  const value = String(name).toLowerCase();
  if (/køkken|kokken|kitchen/.test(value)) return "counter";
  if (/stue|living|sofa/.test(value)) return "sofa";
  if (/sove|bedroom/.test(value)) return "bed";
  if (/kontor|office|desk/.test(value)) return "desk";
  if (/bryggers|laundry|utility/.test(value)) return "washer";
  if (/gang|hallway|corridor/.test(value)) return "stairs";
  if (/entre|entré|\bhall\b|entry/.test(value)) return "door";
  if (/skur|shed|garage|outdoor|ude/.test(value)) return "shed";
  return "home";
}

/**
 * Resolve an entity ID into the small ref the views read. Explicit config
 * overrides may point at an entity that is temporarily missing; the ref is
 * still returned with its ID so the card can show the missing value as `–`.
 */
export function resolveEntityRef(
  hass: ArcusHass,
  entityId: string | null | undefined,
): EntityRef | null {
  if (!entityId) return null;
  const state = hass.states?.[entityId];
  const name = displayName(hass, entityId);
  return {
    entityId,
    state: state?.state,
    name,
    unit:
      typeof state?.attributes?.unit_of_measurement === "string"
        ? state.attributes.unit_of_measurement
        : undefined,
    deviceClass:
      typeof state?.attributes?.device_class === "string"
        ? state.attributes.device_class
        : undefined,
    attributes: state?.attributes ? { ...state.attributes } : undefined,
  };
}

function pickFirst(
  hass: ArcusHass,
  candidates: EntityRegistryEntry[],
  predicate: (entity: EntityRegistryEntry) => boolean = () => true,
): EntityRegistryEntry | null {
  const matching = candidates.filter(predicate);
  if (!matching.length) return null;
  const available = matching.filter((entity) =>
    isAvailable(hass.states[entity.entity_id]?.state),
  );
  return (available.length ? available : matching)[0] ?? null;
}

function byName(
  hass: ArcusHass,
  candidates: EntityRegistryEntry[],
  pattern: RegExp,
): EntityRegistryEntry[] {
  return candidates.filter((entity) =>
    pattern.test(`${entity.entity_id} ${displayName(hass, entity.entity_id)}`),
  );
}

function refForEntity(
  hass: ArcusHass,
  entity: EntityRegistryEntry | null,
): EntityRef | null {
  return entity ? resolveEntityRef(hass, entity.entity_id) : null;
}

function buildOpenings(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  roomName: string,
  t: Translator,
): OpeningModel[] {
  return entities
    .filter((entity) => {
      if (domainOf(entity.entity_id) !== "binary_sensor") return false;
      const deviceClass = attrOf(hass, entity.entity_id, "device_class");
      return (
        typeof deviceClass === "string" && OPENING_CLASSES.has(deviceClass)
      );
    })
    .map((entity) => {
      const deviceClass = String(
        attrOf(hass, entity.entity_id, "device_class") ?? "opening",
      );
      return {
        id: entity.entity_id,
        name: displayName(hass, entity.entity_id),
        kind: openingKind(deviceClass, t),
        room: roomName,
      };
    });
}

function overrideOpenings(
  hass: ArcusHass,
  overrides: NonNullable<ArcusConfig["rooms"][string]>["openings"],
  roomName: string,
  t: Translator,
): OpeningModel[] {
  if (!Array.isArray(overrides)) return [];
  const out: OpeningModel[] = [];
  const seen = new Set<string>();
  for (const item of overrides) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    const deviceClass = String(attrOf(hass, item.id, "device_class") ?? "");
    out.push({
      id: item.id,
      name: item.name ?? displayName(hass, item.id),
      kind: item.kind ?? openingKind(deviceClass, t),
      room: roomName,
    });
  }
  return out;
}

function lightIcon(
  hass: ArcusHass,
  entityId: string,
  roomIcon: string,
): string {
  const icon = attrOf(hass, entityId, "icon");
  if (typeof icon === "string" && icon.startsWith("mdi:")) {
    const key = areaIconKey(icon);
    if (key && key !== "home") return key;
  }
  return roomIcon;
}

function buildLightGroups(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  areaId: string,
  roomIcon: string,
): LightGroupModel[] {
  const lights = entities.filter(
    (entity) => domainOf(entity.entity_id) === "light",
  );
  if (!lights.length) return [];

  const groups = lights.filter((entity) => {
    const members = attrOf(hass, entity.entity_id, "entity_id");
    return Array.isArray(members) && members.length > 0;
  });

  if (!groups.length) {
    return lights.map((entity) => ({
      entityId: entity.entity_id,
      name: displayName(hass, entity.entity_id),
      icon: "light",
      members: [],
      extra: [],
      areaId,
    }));
  }

  const groupIds = new Set(groups.map((group) => group.entity_id));
  const memberIds = new Set<string>();
  const out: LightGroupModel[] = groups.map((group) => {
    const members = uniqueStrings(
      attrOf(hass, group.entity_id, "entity_id"),
    ).filter((id) => id !== group.entity_id);
    for (const id of members) memberIds.add(id);
    return {
      entityId: group.entity_id,
      name: displayName(hass, group.entity_id),
      icon: lightIcon(hass, group.entity_id, roomIcon),
      members,
      extra: [],
      areaId,
    };
  });

  // Everything in the area that is not a master and not already covered by a
  // master's member list is an extra light. Put the extras on the first group,
  // which is how the prototype models a room's hood light.
  const extras = lights
    .map((entity) => entity.entity_id)
    .filter((id) => !groupIds.has(id) && !memberIds.has(id));
  if (extras.length && out[0]) {
    out[0].extra = uniqueStrings([...out[0].extra, ...extras]);
  }
  return out;
}

function overrideLightGroups(
  hass: ArcusHass,
  ids: string[],
  areaId: string,
  roomIcon: string,
): LightGroupModel[] {
  const unique = uniqueStrings(ids);
  if (!unique.length) return [];

  const groups = unique.filter((id) => {
    const members = attrOf(hass, id, "entity_id");
    return Array.isArray(members) && members.length > 0;
  });
  if (!groups.length) {
    return unique.map((id) => ({
      entityId: id,
      name: displayName(hass, id),
      icon: "light",
      members: [],
      extra: [],
      areaId,
    }));
  }

  const groupIds = new Set(groups);
  const memberIds = new Set<string>();
  const out: LightGroupModel[] = groups.map((id) => {
    const members = uniqueStrings(attrOf(hass, id, "entity_id")).filter(
      (member) => member !== id,
    );
    for (const member of members) memberIds.add(member);
    return {
      entityId: id,
      name: displayName(hass, id),
      icon: lightIcon(hass, id, roomIcon),
      members,
      extra: [],
      areaId,
    };
  });
  const extras = unique.filter((id) => !groupIds.has(id) && !memberIds.has(id));
  if (extras.length && out[0]) {
    out[0].extra = uniqueStrings([...out[0].extra, ...extras]);
  }
  return out;
}

interface SelectedArea {
  areaId: string;
  name: string;
  icon?: string | null;
}

function selectedAreas(hass: ArcusHass, config: ArcusConfig): SelectedArea[] {
  const registryOrder = Object.keys(hass.areas ?? {});
  const included = config.areas.include.length
    ? config.areas.include.filter((id) => registryOrder.includes(id))
    : registryOrder;
  const excluded = new Set(config.areas.exclude);
  const selected = included.filter((id) => !excluded.has(id));

  const order = new Map<string, number>();
  config.areas.order.forEach((id, index) => order.set(id, index));

  return selected
    .map((areaId, index) => ({ areaId, index }))
    .sort((a, b) => {
      const aOrder = order.get(a.areaId);
      const bOrder = order.get(b.areaId);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.index - b.index;
    })
    .map(({ areaId }) => {
      const area = hass.areas[areaId];
      return {
        areaId,
        name: area?.name ?? areaId,
        icon: area?.icon,
      };
    });
}

function tempFallbackFor(climate: EntityRef | null): EntityRef | null {
  const current = Number(climate?.attributes?.current_temperature);
  return Number.isFinite(current) ? climate : null;
}

function pickClimate(
  hass: ArcusHass,
  climateEntities: EntityRegistryEntry[],
  override: string | undefined,
): EntityRef | null {
  if (override) return resolveEntityRef(hass, override);
  return refForEntity(hass, pickFirst(hass, climateEntities));
}

function isTemperatureCandidate(
  hass: ArcusHass,
  entity: EntityRegistryEntry,
): boolean {
  if (attrOf(hass, entity.entity_id, "device_class") !== "temperature") {
    return false;
  }
  return !/batteri|battery/i.test(
    `${entity.entity_id} ${displayName(hass, entity.entity_id)}`,
  );
}

function siblingTemperature(
  hass: ArcusHass,
  fallback: EntityRef | null,
): EntityRegistryEntry | null {
  const deviceId = fallback?.entityId
    ? hass.entities?.[fallback.entityId]?.device_id
    : null;
  if (!deviceId) return null;
  return (
    Object.values(hass.entities ?? {}).find((entity) => {
      if (entity.device_id !== deviceId) return false;
      if (domainOf(entity.entity_id) !== "sensor") return false;
      if (!isTemperatureCandidate(hass, entity)) return false;
      return isAvailable(hass.states[entity.entity_id]?.state);
    }) ?? null
  );
}

/**
 * A temperature sensor wins over the climate fallback. Available sensors are
 * preferred, then a name that looks like a temperature reading, then a sensor
 * on the thermostat's own device.
 */
function pickTemperatureSensor(
  hass: ArcusHass,
  sensors: EntityRegistryEntry[],
  tempFallback: EntityRef | null,
  override: string | undefined,
): EntityRef | null {
  if (override) return resolveEntityRef(hass, override);
  const candidates = sensors.filter((entity) =>
    isTemperatureCandidate(hass, entity),
  );
  const available = candidates.filter((entity) =>
    isAvailable(hass.states[entity.entity_id]?.state),
  );
  const pool = available.length ? available : candidates;
  const named = byName(hass, pool, /temp|temperatur/i);
  const picked = refForEntity(hass, named[0] ?? pool[0] ?? null);
  if (picked) return picked;
  return refForEntity(hass, siblingTemperature(hass, tempFallback));
}

function pickDeviceClass(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  deviceClass: string,
): EntityRef | null {
  return refForEntity(
    hass,
    pickFirst(
      hass,
      entities,
      (entity) =>
        attrOf(hass, entity.entity_id, "device_class") === deviceClass,
    ),
  );
}

function pickBattery(
  hass: ArcusHass,
  sensors: EntityRegistryEntry[],
): EntityRef | null {
  const batterySensors = sensors.filter((entity) => {
    const text = `${entity.entity_id} ${displayName(hass, entity.entity_id)}`;
    return (
      attrOf(hass, entity.entity_id, "device_class") === "battery" ||
      /batteri|battery/i.test(text)
    );
  });
  return (
    pickDeviceClass(hass, batterySensors, "battery") ??
    refForEntity(hass, pickFirst(hass, batterySensors))
  );
}

function pickFilter(
  hass: ArcusHass,
  sensors: EntityRegistryEntry[],
): EntityRef | null {
  const filters = sensors.filter((entity) => {
    const text = `${entity.entity_id} ${displayName(hass, entity.entity_id)}`;
    return /filter/i.test(text) && !/alarm|larm|rens/i.test(text);
  });
  return refForEntity(hass, pickFirst(hass, filters));
}

function pickFilterAlarm(
  hass: ArcusHass,
  binarySensors: EntityRegistryEntry[],
): EntityRef | null {
  const alarms = binarySensors.filter((entity) =>
    /filter|filtr/i.test(
      `${entity.entity_id} ${displayName(hass, entity.entity_id)}`,
    ),
  );
  return refForEntity(hass, pickFirst(hass, alarms));
}

function pickPlug(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
): EntityRef | null {
  const candidates = entities.filter((entity) => {
    if (!["sensor", "switch"].includes(domainOf(entity.entity_id))) {
      return false;
    }
    return /plug|stik/i.test(
      `${entity.entity_id} ${displayName(hass, entity.entity_id)}`,
    );
  });
  const sensors = candidates.filter(
    (entity) => domainOf(entity.entity_id) === "sensor",
  );
  return refForEntity(
    hass,
    pickFirst(hass, sensors) ?? pickFirst(hass, candidates),
  );
}

function refByDomain(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  domain: string,
): EntityRef | null {
  return refForEntity(
    hass,
    pickFirst(
      hass,
      entities,
      (entity) => domainOf(entity.entity_id) === domain,
    ),
  );
}

interface RoomEnvironment {
  temp: EntityRef | null;
  tempFallback: EntityRef | null;
  humidity: EntityRef | null;
  co2: EntityRef | null;
  pm25: EntityRef | null;
  battery: EntityRef | null;
  motion: EntityRef | null;
  illuminance: EntityRef | null;
}

function roomEnvironment(
  hass: ArcusHass,
  sensors: EntityRegistryEntry[],
  binarySensors: EntityRegistryEntry[],
  climate: EntityRef | null,
  overrides: RoomOverrideConfig,
): RoomEnvironment {
  const tempFallback = tempFallbackFor(climate);
  return {
    temp: pickTemperatureSensor(hass, sensors, tempFallback, overrides.temp),
    tempFallback,
    humidity: overrides.humidity
      ? resolveEntityRef(hass, overrides.humidity)
      : pickDeviceClass(hass, sensors, "humidity"),
    co2: overrides.co2
      ? resolveEntityRef(hass, overrides.co2)
      : pickDeviceClass(hass, sensors, "carbon_dioxide"),
    pm25: overrides.pm25
      ? resolveEntityRef(hass, overrides.pm25)
      : pickDeviceClass(hass, sensors, "pm25"),
    battery: overrides.battery
      ? resolveEntityRef(hass, overrides.battery)
      : pickBattery(hass, sensors),
    motion: pickDeviceClass(hass, binarySensors, "motion"),
    illuminance: pickDeviceClass(hass, sensors, "illuminance"),
  };
}

function roomLights(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  overrides: RoomOverrideConfig,
  areaId: string,
  roomIcon: string,
): LightGroupModel[] {
  return overrides.lights !== undefined
    ? overrideLightGroups(hass, overrides.lights, areaId, roomIcon)
    : buildLightGroups(hass, entities, areaId, roomIcon);
}

function roomOpenings(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  overrides: RoomOverrideConfig,
  roomName: string,
  t: Translator,
): OpeningModel[] {
  return overrides.openings !== undefined
    ? overrideOpenings(hass, overrides.openings, roomName, t)
    : buildOpenings(hass, entities, roomName, t);
}

function roomCovers(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  override: string[] | undefined,
): EntityRef[] {
  const ids =
    override !== undefined
      ? uniqueStrings(override)
      : entities
          .filter((entity) => domainOf(entity.entity_id) === "cover")
          .map((entity) => entity.entity_id);
  return ids
    .map((id) => resolveEntityRef(hass, id))
    .filter((ref): ref is EntityRef => ref !== null);
}

function roomLock(
  hass: ArcusHass,
  entities: EntityRegistryEntry[],
  override: string | undefined,
): EntityRef | null {
  if (override) return resolveEntityRef(hass, override);
  return refByDomain(hass, entities, "lock");
}

function roomFromArea(
  hass: ArcusHass,
  config: ArcusConfig,
  area: SelectedArea,
  index: number,
  hasExplicitWide: boolean,
  t: Translator,
): RoomModel {
  const entities = entitiesForArea(hass, area.areaId);
  const overrides = config.rooms[area.areaId] ?? {};
  const name = overrides.name ?? area.name;
  const icon = overrides.icon
    ? areaIconKey(overrides.icon)
    : area.icon
      ? areaIconKey(area.icon)
      : areaNameIcon(name);
  const kind = inferRoomKind(area.areaId, name, overrides.kind);
  const wide =
    overrides.wide !== undefined
      ? overrides.wide
      : hasExplicitWide
        ? false
        : index === 0;
  const floorId = hass.areas?.[area.areaId]?.floor_id ?? null;
  const floor = floorId ? hass.floors?.[floorId] : undefined;
  const floorName = typeof floor?.name === "string" ? floor.name : null;
  const floorLevel = typeof floor?.level === "number" ? floor.level : null;
  const tint =
    overrides.tint ?? ROOM_TINTS[index % ROOM_TINTS.length] ?? "#7FAFC4";

  const sensors = entities.filter(
    (entity) => domainOf(entity.entity_id) === "sensor",
  );
  const binarySensors = entities.filter(
    (entity) => domainOf(entity.entity_id) === "binary_sensor",
  );
  const climate = pickClimate(
    hass,
    entities.filter((entity) => domainOf(entity.entity_id) === "climate"),
    overrides.climate,
  );
  const environment = roomEnvironment(
    hass,
    sensors,
    binarySensors,
    climate,
    overrides,
  );
  const lights = roomLights(hass, entities, overrides, area.areaId, icon);
  const openings = roomOpenings(hass, entities, overrides, name, t);
  const covers = roomCovers(hass, entities, overrides.covers);
  const lock = roomLock(hass, entities, overrides.lock);

  return {
    id: area.areaId,
    areaId: area.areaId,
    name,
    icon,
    wide,
    kind,
    floorId,
    floorName,
    floorLevel,
    tint,
    temp: environment.temp,
    tempFallback: environment.tempFallback,
    humidity: environment.humidity,
    co2: environment.co2,
    pm25: environment.pm25,
    lights,
    openings,
    covers,
    lock,
    climate,
    media: overrides.media
      ? resolveEntityRef(hass, overrides.media)
      : refByDomain(hass, entities, "media_player"),
    leak: overrides.leak
      ? resolveEntityRef(hass, overrides.leak)
      : pickDeviceClass(hass, binarySensors, "moisture"),
    fan: refByDomain(hass, entities, "fan"),
    filter: pickFilter(hass, sensors),
    filterAlarm: pickFilterAlarm(hass, binarySensors),
    battery: environment.battery,
    motion: environment.motion,
    illuminance: environment.illuminance,
    plug: pickPlug(hass, entities),
  };
}

/**
 * Discover the configured rooms from the HA area/device/entity registries.
 *
 * Discovery is intentionally state-only: the model is rebuilt when `hass`
 * changes, so this function never subscribes to anything. Unavailable states
 * are kept (the view renders `–`); hidden, disabled, diagnostic/config, and
 * registry-only entities are skipped.
 */
export function discoverRooms(
  hass: ArcusHass,
  config: ArcusConfig,
): RoomModel[] {
  const language = resolveLanguage(hass.language, config);
  const t = createTranslator(language);
  const hasExplicitWide = Object.values(config.rooms ?? {}).some(
    (room) => room?.wide === true,
  );

  return selectedAreas(hass, config).map((area, index) =>
    roomFromArea(hass, config, area, index, hasExplicitWide, t),
  );
}

export { isAvailable as isEntityAvailable };
