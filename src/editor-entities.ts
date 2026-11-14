import type { ArcusHass } from "./types";

/**
 * A filtered entity suggestion rule for one editor field.
 *
 * The visual editor deliberately uses native `<datalist>` elements instead of
 * Home Assistant's `ha-entity-picker`, so suggestions have no dependency on
 * frontend internals. A field-specific rule keeps those lists short and
 * relevant instead of offering every entity in the home.
 */
export interface EntitySuggestionSpec {
  /** Allowed domains, e.g. `["sensor"]` or `["alarm_control_panel"]`. */
  domains?: string[];
  /** Allowed `attributes.device_class` values, e.g. `["power"]`. */
  deviceClasses?: string[];
  /** Matches against the entity ID and its friendly name. */
  name?: RegExp;
  /** Entity must expose at least one non-empty attribute of these names. */
  requireAttributes?: string[];
  /**
   * When true, `name` excludes non-matches even if the device class matches.
   * Use for fields where only one integration makes sense (battery SoC, HRV).
   */
  strict?: boolean;
}

interface RankedEntity {
  id: string;
  rank: number;
  available: boolean;
}

function domainOf(entityId: string): string {
  return entityId.includes(".") ? entityId.slice(0, entityId.indexOf(".")) : "";
}

function attributeOf(hass: ArcusHass, entityId: string, key: string): unknown {
  return hass.states?.[entityId]?.attributes?.[key];
}

function deviceClassOf(hass: ArcusHass, entityId: string): string {
  const value = attributeOf(hass, entityId, "device_class");
  return typeof value === "string" ? value : "";
}

function textOf(hass: ArcusHass, entityId: string): string {
  const friendly = attributeOf(hass, entityId, "friendly_name");
  const registry = hass.entities?.[entityId]?.name;
  return `${entityId} ${
    typeof friendly === "string"
      ? friendly
      : typeof registry === "string"
        ? registry
        : ""
  }`;
}

function isAvailable(hass: ArcusHass, entityId: string): boolean {
  const state = hass.states?.[entityId]?.state;
  return (
    typeof state === "string" &&
    state !== "" &&
    state !== "unavailable" &&
    state !== "unknown"
  );
}

function hasRequiredAttribute(
  hass: ArcusHass,
  entityId: string,
  keys: string[],
): boolean {
  return keys.some((key) => {
    const value = attributeOf(hass, entityId, key);
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object" && value !== null) {
      return Object.keys(value).length > 0;
    }
    return value !== undefined && value !== null && value !== "";
  });
}

function isHidden(hass: ArcusHass, entityId: string): boolean {
  const entry = hass.entities?.[entityId];
  return Boolean(entry?.hidden_by || entry?.disabled_by);
}

function rankOf(
  hass: ArcusHass,
  entityId: string,
  spec: EntitySuggestionSpec,
): number | null {
  const nameHit = Boolean(spec.name?.test(textOf(hass, entityId)));
  if (spec.strict && spec.name && !nameHit) return null;
  if (spec.deviceClasses?.length) {
    const deviceClass = deviceClassOf(hass, entityId);
    if (spec.deviceClasses.includes(deviceClass)) return 0;
    return nameHit ? 1 : null;
  }
  // A name without a device class is a strict filter: the field is meant for a
  // specific integration (prayers, price, water meter), so unrelated sensors
  // must not flood the list. Free-text entry still works.
  if (spec.name) return nameHit ? 1 : null;
  return 2;
}

function collect(hass: ArcusHass, spec: EntitySuggestionSpec): RankedEntity[] {
  const ranked: RankedEntity[] = [];
  for (const entityId of Object.keys(hass.states ?? {})) {
    if (isHidden(hass, entityId)) continue;
    const domain = domainOf(entityId);
    if (spec.domains?.length && !spec.domains.includes(domain)) continue;
    if (
      spec.requireAttributes?.length &&
      !hasRequiredAttribute(hass, entityId, spec.requireAttributes)
    ) {
      continue;
    }
    const rank = rankOf(hass, entityId, spec);
    if (rank === null) continue;
    ranked.push({
      id: entityId,
      rank,
      available: isAvailable(hass, entityId),
    });
  }
  return ranked;
}

function domainFallback(hass: ArcusHass, spec: EntitySuggestionSpec): string[] {
  if (!spec.domains?.length) return [];
  const ids = Object.keys(hass.states ?? {}).filter(
    (entityId) =>
      !isHidden(hass, entityId) && spec.domains!.includes(domainOf(entityId)),
  );
  return ids.sort((a, b) => {
    const availability =
      Number(isAvailable(hass, b)) - Number(isAvailable(hass, a));
    return availability || a.localeCompare(b);
  });
}

/**
 * Ranked, deduplicated entity IDs for one editor field.
 *
 * Order: exact device class, then a name match, then the remaining entities in
 * the allowed domain(s). Available entities come first inside each rank. When
 * a filter is too narrow (for example a prayer integration that is not
 * installed), the field falls back to its domain and finally to the capped
 * global list, so the picker never becomes unusable.
 */
export function suggestEntities(
  hass: ArcusHass | undefined,
  spec: EntitySuggestionSpec,
  limit = 60,
): string[] {
  if (!hass) return [];
  const capped = Math.max(1, Math.floor(limit));
  const ranked = collect(hass, spec);
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  if (ranked.length) {
    return ranked.slice(0, capped).map((item) => item.id);
  }

  // A strict name filter is the field's expected integration; if it is absent,
  // an empty list is better than every entity.
  if (spec.strict && spec.name) return [];
  if (spec.name && !spec.deviceClasses?.length) return [];

  const fallback = domainFallback(hass, spec);
  if (fallback.length) return fallback.slice(0, capped);
  // A field with a domain is driven by that domain: when the home has no such
  // entity, an empty suggestion list is more useful than every entity.
  if (spec.domains?.length) return [];

  return Object.keys(hass.states ?? {})
    .filter((entityId) => !isHidden(hass, entityId))
    .slice(0, capped);
}

/** Stable DOM id for a field's datalist. */
export function datalistId(path: string): string {
  return `arcus-entities-${path.replace(/[^a-z0-9]+/gi, "-")}`;
}
