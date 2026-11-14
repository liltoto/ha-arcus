import { useMemo } from "react";
import { useActions } from "../providers/ArcusProvider";

export interface LightActions {
  toggle(entityId: string): void;
  setBrightness(entityId: string, percent: number): void;
}

/**
 * The light-service calls shared by the room and lights sheets. A zero
 * brightness is a turn-off so the slider cannot leave a lamp at 1 %.
 */
export function useLightActions(): LightActions {
  const actions = useActions();

  return useMemo(
    () => ({
      toggle(entityId: string): void {
        actions.callService("light", "toggle", {}, { entity_id: entityId });
      },
      setBrightness(entityId: string, percent: number): void {
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
      },
    }),
    [actions],
  );
}
