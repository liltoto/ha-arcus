import { createStore } from "zustand/vanilla";
import type { ArcusStore, ArcusStoreState } from "../types";

/**
 * One isolated store per card instance. The card publishes a fresh snapshot
 * into it; React components subscribe through the hooks in `ArcusProvider`.
 *
 * A factory instead of a module-level `create()` keeps tests, Storybook
 * stories, and several Arcus cards on one dashboard from sharing state.
 */
export function createArcusStore(state: ArcusStoreState): ArcusStore {
  return createStore<ArcusStoreState>()(() => state);
}
