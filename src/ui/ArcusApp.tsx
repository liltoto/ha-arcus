import { HomePage } from "./pages/HomePage";
import { ArcusProvider } from "./providers/ArcusProvider";
import type { ArcusStore } from "./types";

export interface ArcusAppProps {
  store: ArcusStore;
}

/**
 * The single React root rendered inside `<arcus-card>`. The card owns the
 * store and publishes snapshots; this shell only injects it.
 */
export function ArcusApp({ store }: ArcusAppProps) {
  return (
    <ArcusProvider store={store}>
      <HomePage />
    </ArcusProvider>
  );
}
