import { HomePage } from "./pages/HomePage";
import { ArcusProvider } from "./providers/ArcusProvider";
import { AppBoundary } from "./pages/AppBoundary";
import type { ArcusStore } from "./types";

export interface ArcusAppProps {
  store: ArcusStore;
}

/**
 * The single React root rendered inside `<arcus-card>`. The card owns the
 * store and publishes snapshots; this shell only injects it.
 */
export const ArcusApp = ({ store }: ArcusAppProps) => {
  return (
    <ArcusProvider store={store}>
      <AppBoundary>
        <HomePage />
      </AppBoundary>
    </ArcusProvider>
  );
};
