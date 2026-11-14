import type { AtmosphereSetting } from "../types";
import type { SheetApp } from "../views/layers/types";
import { HomePage } from "./pages/HomePage";
import { ArcusProvider } from "./providers/ArcusProvider";
import type { ArcusProviderProps } from "./types";

export interface ArcusAppProps extends Omit<ArcusProviderProps, "children"> {
  /** Imperative card surface used by the sheet and layer organisms. */
  app: SheetApp;
  atmo: AtmosphereSetting;
  dark: boolean;
}

/**
 * The single React root rendered inside `<arcus-card>`. It forwards the
 * card's state to the provider and mounts the current page.
 */
export function ArcusApp({
  app,
  atmo,
  dark,
  ...provider
}: ArcusAppProps) {
  return (
    <ArcusProvider {...provider}>
      <HomePage app={app} atmo={atmo} dark={dark} />
    </ArcusProvider>
  );
}
