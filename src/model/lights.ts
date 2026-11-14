import type { LightGroupModel, RoomModel } from "../types";

/**
 * Every light controlled by these groups, in first-seen order and
 * deduplicated. A group contributes its members (or its own entity when it
 * has no members) plus its extras.
 */
export function lightIdsForGroups(
  groups: readonly LightGroupModel[],
): string[] {
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

export function lightIdsForRoom(room: Pick<RoomModel, "lights">): string[] {
  return lightIdsForGroups(room.lights);
}
